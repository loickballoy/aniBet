-- ============================================================================
-- 006_fn_raise_dispute.sql
-- ============================================================================

create or replace function fn_raise_dispute(
    p_event_id integer,
    p_user_id integer,
    p_counter_evidence_url text
)
returns integer as $$
declare
    v_status text;
    v_dispute_id integer;
begin
    select status into v_status from events where id = p_event_id for update;
    if v_status is null then
        raise exception 'Event not found';
    end if;
    if v_status <> 'resolved_pending_dispute' then
        raise exception 'Event is not in a disputable state (status: %)', v_status;
    end if;

    update events set status = 'disputed' where id = p_event_id;

    insert into resolution_disputes (event_id, raised_by, counter_evidence_url)
    values (p_event_id, p_user_id, p_counter_evidence_url)
    returning id into v_dispute_id;

    return v_dispute_id;
end;
$$ language plpgsql;