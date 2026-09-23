-- ============================================================================
-- aniBet — Fonctions transactionnelles
-- ============================================================================

-- ---------------------------------------------------------------------------
-- fn_place_bet
-- ---------------------------------------------------------------------------

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

    select status into v_event_status from events where id = v_event_id for update;
    if v_event_status <> 'open' then
        raise exception 'Bets are closed for this event: %', v_event_status;
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


-- ---------------------------------------------------------------------------
-- fn_resolve_event
-- ---------------------------------------------------------------------------

create or replace function fn_resolve_event(
    p_event_id integer,
    p_winning_outcome_id integer,
    p_resolved_by integer,
    p_note text default null
)
returns void as $$
declare
    v_event_status text;
    v_pool_total integer;
    v_fee_bps integer;
    v_winning_pool integer;
    r_bet record;
    v_payout integer;
begin
    select status, pool_total, fee_bps into v_event_status, v_pool_total, v_fee_bps
    from events where id = p_event_id for update;

    if v_event_status is null then
        raise exception 'Event not found';
    end if;
    if v_event_status = 'resolved' then
        raise exception 'Event already resolved';
    end if;

    select pool_points into v_winning_pool
    from event_outcomes where id = p_winning_outcome_id for update;
    if v_winning_pool is null then
        raise exception 'Winning outcome not found';
    end if;

    update events set status = 'resolved', resolved_at = now() where id = p_event_id;
    update event_outcomes set is_winner = true where id = p_winning_outcome_id;

    for r_bet in
        select b.id, b.user_id, b.points_placed
        from bets b
        join event_outcomes eo on eo.id = b.outcome_id
        where eo.event_id = p_event_id
          and b.outcome_id = p_winning_outcome_id
          and b.status not in ('refunded')
    loop
        if v_winning_pool > 0 then
            v_payout := floor((r_bet.points_placed::numeric / v_winning_pool) * v_pool_total * (1 - v_fee_bps / 10000.0));
        else
            v_payout := 0;
        end if;

        update bets set status = 'won' where id = r_bet.id;

        update "User" set points_balance = points_balance + v_payout where id = r_bet.user_id;

        insert into point_transactions (user_id, kind, amount, reference_type, reference_id)
        values (r_bet.user_id, 'bet_won', v_payout, 'bet', r_bet.id);
    end loop;

    update bets set status = 'lost'
    where outcome_id in (select id from event_outcomes where event_id = p_event_id)
      and outcome_id <> p_winning_outcome_id
      and status = 'pending';

    insert into event_resolution (event_id, winning_outcomes_id, resolved_by, note)
    values (p_event_id, p_winning_outcome_id, p_resolved_by, p_note);
end;
$$ language plpgsql;


-- ---------------------------------------------------------------------------
-- fn_resolve_bingo_card
-- ---------------------------------------------------------------------------

create or replace function fn_resolve_bingo_card(
    p_card_id integer,
    p_happened_item_ids integer[],
    p_reward_per_hit integer default 500
)
returns void as $$
declare
    v_status text;
    r_entry record;
    v_hits integer;
    v_coins integer;
begin
    select status into v_status from bingo_cards where id = p_card_id for update;
    if v_status is null then
        raise exception 'Card not found';
    end if;
    if v_status = 'resolved' then
        raise exception 'Already resolved';
    end if;

    update bingo_items set did_happen = (id = any(p_happened_item_ids)) where card_id = p_card_id;

    for r_entry in
        select id, user_id, selected_item_ids from bingo_entries where card_id = p_card_id
    loop
        select count(*) into v_hits
        from unnest(r_entry.selected_item_ids) as sel(item_id)
        where sel.item_id = any(p_happened_item_ids);

        v_coins := v_hits * p_reward_per_hit;

        update bingo_entries set score = v_hits, coins_earned = v_coins where id = r_entry.id;

        if v_coins > 0 then
            update "User" set points_balance = points_balance + v_coins where id = r_entry.user_id;

            insert into point_transactions (user_id, kind, amount, reference_type, reference_id)
            values (r_entry.user_id, 'bingo_reward', v_coins, 'bingo_entry', r_entry.id);
        end if;
    end loop;

    update bingo_cards set status = 'resolved' where id = p_card_id;
end;
$$ language plpgsql;