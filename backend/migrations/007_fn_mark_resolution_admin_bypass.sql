-- ============================================================================
-- 007_fn_mark_resolution_admin_bypass.sql
--
-- Un admin/owner peut résoudre N'IMPORTE QUEL event, même sans mod_scope
-- explicite dessus — cohérent avec le reste du projet où admin = tous les
-- pouvoirs. Un mod scopé peut résoudre seulement les events de sa série.
--
-- Important : ce bypass est ICI, pas dans fn_is_mod_for_event. Cette
-- dernière reste strictement basée sur mod_scopes, car elle sert AUSSI
-- au blocage self-bet dans fn_place_bet — un bypass admin généralisé y
-- empêcherait tout admin de parier sur quoi que ce soit, nulle part.
-- ============================================================================

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
    v_role text;
begin
    select role into v_role from "User" where id = p_resolved_by;

    if v_role not in ('admin', 'owner') and not fn_is_mod_for_event(p_resolved_by, p_event_id) then
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