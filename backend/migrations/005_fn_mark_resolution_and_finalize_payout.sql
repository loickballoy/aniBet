-- ============================================================================
-- 005_fn_mark_resolution_and_finalize_payout.sql
--
-- Casse l'ancienne fn_resolve_event en deux étapes : marquer la résolution
-- (public, avec preuve) puis payer (seulement si aucune dispute ouverte).
-- L'ancienne fn_resolve_event reste en base pour compatibilité mais n'est
-- plus appelée par le code Python après cette étape — tu peux la DROP plus
-- tard une fois sûr que plus rien n'y fait référence.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- fn_mark_resolution : vérifie que l'appelant est mod pour cette série,
-- marque l'event "resolved_pending_dispute", marque l'outcome gagnant,
-- journalise avec la preuve. NE TOUCHE À AUCUN SOLDE.
-- ---------------------------------------------------------------------------

create or replace function fn_mark_resolution(
    p_event_id integer,
    p_winning_outcome_id integer,
    p_resolved_by integer,
    p_evidence_url text
)
returns void as $$
declare
    v_status text;
    v_outcome_event_id integer;
begin
    if not fn_is_mod_for_event(p_resolved_by, p_event_id) then
        raise exception 'User is not a mod for this event''s series';
    end if;

    select status into v_status from events where id = p_event_id for update;
    if v_status is null then
        raise exception 'Event not found';
    end if;
    if v_status not in ('open', 'locked') then
        raise exception 'Event already resolved or not resolvable (status: %)', v_status;
    end if;

    select event_id into v_outcome_event_id from event_outcomes where id = p_winning_outcome_id;
    if v_outcome_event_id is distinct from p_event_id then
        raise exception 'Outcome does not belong to this event';
    end if;

    update events
    set status = 'resolved_pending_dispute', resolved_at = now()
    where id = p_event_id;

    update event_outcomes set is_winner = true where id = p_winning_outcome_id;

    insert into event_resolution_log (event_id, resolved_by, winning_outcome_id, evidence_url)
    values (p_event_id, p_resolved_by, p_winning_outcome_id, p_evidence_url);
end;
$$ language plpgsql;


-- ---------------------------------------------------------------------------
-- fn_finalize_payout : reprend la logique de paiement de l'ancienne
-- fn_resolve_event à l'identique (même formule, même boucle), mais exige
-- status = 'resolved_pending_dispute' et aucune dispute ouverte.
-- ---------------------------------------------------------------------------

create or replace function fn_finalize_payout(p_event_id integer)
returns void as $$
declare
    v_status text;
    v_winning_outcome_id integer;
    v_pool_total integer;
    v_fee_bps integer;
    v_winning_pool integer;
    r_bet record;
    v_payout integer;
begin
    select status, pool_total, fee_bps into v_status, v_pool_total, v_fee_bps
    from events where id = p_event_id for update;

    if v_status is null then
        raise exception 'Event not found';
    end if;
    if v_status <> 'resolved_pending_dispute' then
        raise exception 'Event is not ready for payout (status: %)', v_status;
    end if;

    if exists (select 1 from resolution_disputes where event_id = p_event_id and status = 'open') then
        raise exception 'Event has an open dispute — resolve it before finalizing payout';
    end if;

    select id, pool_points into v_winning_outcome_id, v_winning_pool
    from event_outcomes where event_id = p_event_id and is_winner = true;

    for r_bet in
        select b.id, b.user_id, b.points_placed
        from bets b
        join event_outcomes eo on eo.id = b.outcome_id
        where eo.event_id = p_event_id
          and b.outcome_id = v_winning_outcome_id
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
      and outcome_id <> v_winning_outcome_id
      and status = 'pending';

    update events set status = 'resolved' where id = p_event_id;
end;
$$ language plpgsql;