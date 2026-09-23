-- ============================================================================
-- 013_fn_weekly_connections.sql
--
-- Compromis de design assumé : si un joueur échoue (mistakes atteint la
-- limite), la pénalité streak/reward s'applique immédiatement. S'il étend
-- ensuite via une pub et réussit, il regagne un streak à 1, pas une
-- restauration rétroactive de sa séquence précédente. Simple à raisonner
-- et à tester ; à revoir plus tard si ça s'avère frustrant en usage réel.
-- ============================================================================

create or replace function fn_submit_weekly_guess(
    p_user_id integer,
    p_puzzle_id integer,
    p_week_of date,
    p_is_correct boolean,
    p_category_label text,
    p_max_mistakes integer,
    p_base_reward integer
)
returns table(solved boolean, failed boolean, mistakes integer, found_categories jsonb) as $$
declare
    v_mistakes integer;
    v_found jsonb;
    v_ad_extended boolean;
    v_current_solved boolean;
    v_effective_max integer;
    v_new_solved boolean;
    v_new_failed boolean;
begin
    insert into weekly_attempts (user_id, puzzle_id, mistakes, tries_used, found_categories)
    values (p_user_id, p_puzzle_id, 0, 0, '[]'::jsonb)
    on conflict (user_id, puzzle_id) do nothing;

    select weekly_attempts.mistakes, weekly_attempts.found_categories,
           weekly_attempts.ad_extended, weekly_attempts.solved
    into v_mistakes, v_found, v_ad_extended, v_current_solved
    from weekly_attempts
    where user_id = p_user_id and puzzle_id = p_puzzle_id
    for update;

    if v_current_solved is not null then
        raise exception 'This puzzle is already concluded (solved=%)', v_current_solved;
    end if;

    v_effective_max := p_max_mistakes + (case when v_ad_extended then 1 else 0 end);

    if p_is_correct then
        v_found := v_found || jsonb_build_array(p_category_label);
    else
        v_mistakes := v_mistakes + 1;
    end if;

    v_new_solved := jsonb_array_length(v_found) >= 4;
    v_new_failed := (not v_new_solved) and (v_mistakes >= v_effective_max);

    update weekly_attempts
    set mistakes = v_mistakes,
        tries_used = tries_used + 1,
        found_categories = v_found,
        solved = case when v_new_solved then true when v_new_failed then false else null end,
        completed_at = case when v_new_solved or v_new_failed then now() else null end
    where user_id = p_user_id and puzzle_id = p_puzzle_id;

    if v_new_solved then
        perform fn_apply_daily_reward_and_streak(
            p_user_id, p_week_of, true, greatest(200, p_base_reward - v_mistakes * 150)
        );
    elsif v_new_failed and v_ad_extended then
        -- Échec DÉFINITIF seulement si l'extension était déjà consommée.
        -- Un premier échec (v_ad_extended encore false) reste "provisoire" :
        -- le joueur peut encore étendre via fn_extend_weekly_tries, donc on
        -- ne casse pas son streak tant que cette porte est encore ouverte.
        perform fn_apply_daily_reward_and_streak(p_user_id, p_week_of, false, 0);
    end if;

    solved := v_new_solved;
    failed := v_new_failed;
    mistakes := v_mistakes;
    found_categories := v_found;
    return next;
end;
$$ language plpgsql;


-- ---------------------------------------------------------------------------
-- fn_extend_weekly_tries : réouvre une tentative ratée, une seule fois par
-- puzzle. Le frontend ne propose ce bouton que quand mistakes a atteint la
-- limite de base sans extension déjà utilisée (donc solved=false, jamais
-- true, et ad_extended encore false).
-- ---------------------------------------------------------------------------

create or replace function fn_extend_weekly_tries(p_user_id integer, p_puzzle_id integer)
returns void as $$
declare
    v_solved boolean;
    v_ad_extended boolean;
begin
    select weekly_attempts.solved, weekly_attempts.ad_extended
    into v_solved, v_ad_extended
    from weekly_attempts
    where user_id = p_user_id and puzzle_id = p_puzzle_id
    for update;

    if v_solved is null then
        raise exception 'Puzzle not yet failed, nothing to extend';
    end if;
    if v_solved = true then
        raise exception 'Puzzle already solved, cannot extend';
    end if;
    if v_ad_extended then
        raise exception 'Already extended once for this puzzle';
    end if;

    update weekly_attempts
    set solved = null, ad_extended = true, completed_at = null
    where user_id = p_user_id and puzzle_id = p_puzzle_id;
end;
$$ language plpgsql;