-- ============================================================================
-- 016_fn_place_bet_locks_at.sql
--
-- fn_place_bet refuse désormais tout pari après events.locks_at. Avant,
-- seul status = 'open' était vérifié : tant que personne ne cliquait
-- "Lock", on pouvait parier après la date limite (ex : après un leak).
-- Redéfinition complète de la fonction (reprise de 004 + ce check).
-- ============================================================================

create or replace function fn_place_bet(
    p_user_id integer,
    p_outcome_id integer,
    p_points_placed integer
)
returns table(bet_id integer, new_balance integer) as $$
declare
    v_balance integer;
    v_event_id integer;
    v_event_status text;
    v_locks_at timestamptz;
    v_outcome_pool integer;
    v_bet_id integer;
begin
    if p_points_placed <= 0 then
        raise exception 'points_placed must be positive';
    end if;

    select event_id, pool_points into v_event_id, v_outcome_pool
    from event_outcomes where id = p_outcome_id for update;

    if v_event_id is null then
        raise exception 'Outcome not found';
    end if;

    -- NOUVEAU : un mod ne peut pas parier sur un event de sa propre série.
    if fn_is_mod_for_event(p_user_id, v_event_id) then
        raise exception 'Mods cannot bet on events within their own scope';
    end if;

    select status, locks_at into v_event_status, v_locks_at from events where id = v_event_id for update;
    if v_event_status <> 'open' then
        raise exception 'Bets are closed for this event: %', v_event_status;
    end if;
    -- NOUVEAU : les paris ferment automatiquement à locks_at, même si
    -- personne n'a cliqué "Lock". Sinon on pourrait parier après un leak.
    if v_locks_at is not null and now() >= v_locks_at then
        raise exception 'Bets are closed for this event: betting deadline has passed';
    end if;

    if exists (
        select 1 from bets b
        join event_outcomes eo on eo.id = b.outcome_id
        where b.user_id = p_user_id and eo.event_id = v_event_id and b.status <> 'refunded'
    ) then
        raise exception 'User already placed a bet on this event';
    end if;

    select points_balance into v_balance from "User" where id = p_user_id for update;
    if v_balance is null then
        raise exception 'User not found';
    end if;
    if v_balance < p_points_placed then
        raise exception 'User does not have the funds to place such a bet';
    end if;

    update "User" set points_balance = points_balance - p_points_placed where id = p_user_id;

    insert into bets (user_id, outcome_id, points_placed, status)
    values (p_user_id, p_outcome_id, p_points_placed, 'pending')
    returning id into v_bet_id;

    update event_outcomes set pool_points = pool_points + p_points_placed where id = p_outcome_id;
    update events set pool_total = pool_total + p_points_placed where id = v_event_id;

    insert into point_transactions (user_id, kind, amount, reference_type, reference_id)
    values (p_user_id, 'bet_placed', -p_points_placed, 'bet', v_bet_id);

    bet_id := v_bet_id;
    new_balance := v_balance - p_points_placed;
    return next;
end;
$$ language plpgsql;