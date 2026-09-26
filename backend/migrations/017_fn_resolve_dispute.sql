-- ============================================================================
-- 017_fn_resolve_dispute.sql
--
-- Clôture d'une dispute par un admin/owner (jamais par le mod qui a résolu :
-- on ne juge pas sa propre décision). La décision est définitive :
--   - 'upheld'     : le résultat du mod est maintenu
--   - 'overturned' : un autre outcome devient gagnant
-- Dans les deux cas, le paiement est finalisé dans la même transaction, pour
-- qu'un event ne puisse pas être contesté en boucle.
-- ============================================================================

create or replace function fn_resolve_dispute(
    p_event_id integer,
    p_resolved_by integer,
    p_decision text,
    p_new_winning_outcome_id integer
)
returns void as $$
declare
    v_status text;
    v_outcome_event_id integer;
    v_counter_evidence text;
begin
    if p_decision not in ('upheld', 'overturned') then
        raise exception 'Decision must be upheld or overturned';
    end if;

    select status into v_status from events where id = p_event_id for update;
    if v_status is null then
        raise exception 'Event not found';
    end if;
    if v_status <> 'disputed' then
        raise exception 'Event is not disputed (status: %)', v_status;
    end if;

    if p_decision = 'overturned' then
        select event_id into v_outcome_event_id from event_outcomes where id = p_new_winning_outcome_id;
        if v_outcome_event_id is distinct from p_event_id then
            raise exception 'New winning outcome does not belong to this event';
        end if;

        select counter_evidence_url into v_counter_evidence
        from resolution_disputes
        where event_id = p_event_id and status = 'open'
        order by created_at desc limit 1;

        update event_outcomes set is_winner = false where event_id = p_event_id;
        update event_outcomes set is_winner = true where id = p_new_winning_outcome_id;

        insert into event_resolution_log (event_id, resolved_by, winning_outcome_id, evidence_url)
        values (p_event_id, p_resolved_by, p_new_winning_outcome_id, coalesce(v_counter_evidence, 'dispute-overturned'));
    end if;

    update resolution_disputes
    set status = case when p_decision = 'upheld' then 'upheld_original' else 'overturned' end,
        escalated_to = p_resolved_by,
        resolved_at = now()
    where event_id = p_event_id and status = 'open';

    update events set status = 'resolved_pending_dispute' where id = p_event_id;
    perform fn_finalize_payout(p_event_id);
end;
$$ language plpgsql;