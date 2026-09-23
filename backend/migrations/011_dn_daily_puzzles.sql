-- ============================================================================
-- 011_fn_daily_puzzles.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- fn_apply_daily_reward_and_streak : logique commune trivia + silhouette +
-- weekly connections. Appelée une seule fois par jour et par utilisateur,
-- au moment où le résultat (réussi/raté) est connu.
--
-- Échouer casse le streak, pas seulement le manquer — cohérent avec le
-- "no mercy" du CDC. Un seul format étant actif par jour (jamais deux en
-- même temps), pas de risque qu'un 2e appel le même jour écrase le premier.
-- ---------------------------------------------------------------------------

create or replace function fn_apply_daily_reward_and_streak(
    p_user_id integer,
    p_activity_date date,
    p_solved boolean,
    p_reward integer
)
returns table(new_balance integer, current_streak integer, longest_streak integer) as $$
declare
    v_last_date date;
    v_current integer;
    v_longest integer;
begin
    insert into streaks (user_id, current_streak, longest_streak, last_completed_date)
    values (p_user_id, 0, 0, null)
    on conflict (user_id) do nothing;

    select streaks.last_completed_date, streaks.current_streak, streaks.longest_streak
    into v_last_date, v_current, v_longest
    from streaks where user_id = p_user_id for update;

    if not p_solved then
        v_current := 0;
    elsif p_activity_date = v_last_date then
        null;  -- déjà compté aujourd'hui (ne devrait pas arriver vu le planning à 1 format/jour)
    elsif v_last_date is not null and p_activity_date = v_last_date + 1 then
        v_current := v_current + 1;
    else
        v_current := 1;
    end if;

    v_longest := greatest(v_longest, v_current);

    update streaks
    set current_streak = v_current, longest_streak = v_longest, last_completed_date = p_activity_date
    where user_id = p_user_id;

    if p_solved and p_reward > 0 then
        update "User" set points_balance = points_balance + p_reward where id = p_user_id;
        insert into point_transactions (user_id, kind, amount, reference_type)
        values (p_user_id, 'daily_reward', p_reward, 'daily_challenge');
    end if;

    select points_balance into new_balance from "User" where id = p_user_id;
    current_streak := v_current;
    longest_streak := v_longest;
    return next;
end;
$$ language plpgsql;


-- ---------------------------------------------------------------------------
-- fn_submit_trivia_attempt : soumission unique, tout ou rien. Rejette
-- explicitement si l'utilisateur a déjà tenté ce challenge — c'est la
-- garantie "single-shot", pas juste une convention côté route.
-- ---------------------------------------------------------------------------

create or replace function fn_submit_trivia_attempt(
    p_user_id integer,
    p_challenge_id integer,
    p_challenge_date date,
    p_guesses jsonb,
    p_score integer,
    p_solved boolean,
    p_reward integer
)
returns void as $$
begin
    if exists (select 1 from daily_attempts where user_id = p_user_id and challenge_id = p_challenge_id) then
        raise exception 'Trivia already attempted for this challenge';
    end if;

    insert into daily_attempts (user_id, challenge_id, guesses, score, result, completed_at)
    values (p_user_id, p_challenge_id, p_guesses, p_score,
            case when p_solved then 'solved' else 'failed' end, now());

    perform fn_apply_daily_reward_and_streak(p_user_id, p_challenge_date, p_solved, p_reward);
end;
$$ language plpgsql;


-- ---------------------------------------------------------------------------
-- fn_submit_silhouette_guess : un essai à la fois. p_guess_correct est
-- calculé côté Python (comparaison de chaînes, pas sensible niveau
-- concurrence) ; cette fonction gère l'état atomique (tableau de guesses,
-- compteur, conclusion) et ne touche à l'argent/streak qu'à la conclusion.
-- ---------------------------------------------------------------------------

create or replace function fn_submit_silhouette_guess(
    p_user_id integer,
    p_challenge_id integer,
    p_challenge_date date,
    p_guess text,
    p_guess_correct boolean,
    p_max_guesses integer,
    p_reward integer
)
returns table(result text, guesses_used integer) as $$
declare
    v_existing_result text;
    v_guesses jsonb;
    v_guesses_count integer;
    v_final_result text;
begin
    select daily_attempts.result, daily_attempts.guesses
    into v_existing_result, v_guesses
    from daily_attempts
    where user_id = p_user_id and challenge_id = p_challenge_id
    for update;

    if v_existing_result is not null then
        raise exception 'This challenge is already concluded (%)', v_existing_result;
    end if;

    if v_guesses is null then
        v_guesses := '[]'::jsonb;
        insert into daily_attempts (user_id, challenge_id, guesses)
        values (p_user_id, p_challenge_id, v_guesses);
    end if;

    v_guesses := v_guesses || jsonb_build_array(p_guess);
    v_guesses_count := jsonb_array_length(v_guesses);

    if p_guess_correct then
        v_final_result := 'solved';
    elsif v_guesses_count >= p_max_guesses then
        v_final_result := 'failed';
    else
        v_final_result := null;  -- essai raté, mais il en reste
    end if;

    update daily_attempts
    set guesses = v_guesses,
        result = v_final_result,
        completed_at = case when v_final_result is not null then now() else null end
    where user_id = p_user_id and challenge_id = p_challenge_id;

    if v_final_result is not null then
        perform fn_apply_daily_reward_and_streak(
            p_user_id, p_challenge_date, v_final_result = 'solved', p_reward
        );
    end if;

    result := v_final_result;
    guesses_used := v_guesses_count;
    return next;
end;
$$ language plpgsql;