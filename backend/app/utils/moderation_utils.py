"""
Système communautaire : mods scopés par série, propositions d'events,
notifications. C'est ce qui remplace "je crée chaque event moi-même".
"""

from psycopg.types.json import Json

from app.db import pool
from app.models.moderation import ModScope, EventProposal, ResolutionDispute, Notification
from app.models.event import Event, EventOutcome
from app.utils import bet_utils


# ---------------------------------------------------------------------------
# Mod scopes
# ---------------------------------------------------------------------------

def grant_mod_scope(user_id: int, series_id: int, granted_by: int) -> ModScope:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO mod_scopes (user_id, series_id, granted_by)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, series_id) DO UPDATE SET active = true, granted_by = %s, granted_at = now()
                RETURNING *
                """,
                (user_id, series_id, granted_by, granted_by),
            )
            row = cur.fetchone()
        conn.commit()
    return ModScope(**row)


def revoke_mod_scope(user_id: int, series_id: int) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE mod_scopes SET active = false WHERE user_id = %s AND series_id = %s",
                (user_id, series_id),
            )
        conn.commit()


def get_mod_scopes_for_user(user_id: int) -> list[int]:
    """Renvoie la liste des series_id où cet utilisateur est mod actif."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT series_id FROM mod_scopes WHERE user_id = %s AND active = true",
                (user_id,),
            )
            rows = cur.fetchall()
    return [row["series_id"] for row in rows]


def is_mod_for_series(user_id: int, series_id: int) -> bool:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM mod_scopes WHERE user_id = %s AND series_id = %s AND active = true",
                (user_id, series_id),
            )
            return cur.fetchone() is not None


# ---------------------------------------------------------------------------
# Propositions
# ---------------------------------------------------------------------------

def propose_event(proposed_by: int, title: str, description: str | None,
                   series_id: int, outcomes: list[str], source_url: str | None) -> EventProposal:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO event_proposals (proposed_by, title, description, series_id, outcomes, source_url)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (proposed_by, title, description, series_id, outcomes, source_url),
            )
            row = cur.fetchone()
        conn.commit()

    proposal = EventProposal(**row)

    notify_owners("proposal_pending", {"proposal_id": proposal.id, "title": title, "series_id": series_id})
    notify_mods_for_series(series_id, "proposal_pending", {"proposal_id": proposal.id, "title": title})

    return proposal


def get_proposal_by_id(proposal_id: int) -> EventProposal | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM event_proposals WHERE id = %s", (proposal_id,))
            row = cur.fetchone()
    return EventProposal(**row) if row else None

def get_pending_proposals_for_mod(user_id: int, is_admin: bool = False) -> list[EventProposal]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            if is_admin:
                cur.execute("SELECT * FROM event_proposals WHERE status = 'pending' ORDER BY created_at")
            else:
                series_ids = get_mod_scopes_for_user(user_id)
                if not series_ids:
                    return []
                cur.execute(
                    "SELECT * FROM event_proposals WHERE status = 'pending' AND series_id = ANY(%s) ORDER BY created_at",
                    (series_ids,),
                )
            rows = cur.fetchall()
    return [EventProposal(**row) for row in rows]


def approve_proposal(proposal_id: int, reviewed_by: int, opens_at, locks_at,
                      fee_bps: int, cover_url: str | None, is_admin: bool = False) -> tuple[Event, list[EventOutcome]]:
    proposal = get_proposal_by_id(proposal_id)
    if proposal is None:
        raise ValueError("Proposal not found")
    if proposal.status != "pending":
        raise ValueError("Proposal already reviewed")
    if not is_admin and not is_mod_for_series(reviewed_by, proposal.series_id):
        raise ValueError("Not a mod for this proposal's series")

    event, outcomes = bet_utils.create_event(
        title=proposal.title,
        description=proposal.description,
        series_id=proposal.series_id,
        opens_at=opens_at,
        locks_at=locks_at,
        fee_bps=fee_bps,
        cover_url=cover_url,
        created_by=reviewed_by,
        outcome_labels=proposal.outcomes,
        tag_ids=[],
    )

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE event_proposals SET status = 'approved', reviewed_by = %s, reviewed_at = now() WHERE id = %s",
                (reviewed_by, proposal_id),
            )
            cur.execute("UPDATE events SET proposal_id = %s WHERE id = %s", (proposal_id, event.id))
        conn.commit()

    return event, outcomes


def reject_proposal(proposal_id: int, reviewed_by: int) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE event_proposals SET status = 'rejected', reviewed_by = %s, reviewed_at = now() WHERE id = %s",
                (reviewed_by, proposal_id),
            )
        conn.commit()


def _slugify(name: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def propose_series(proposed_by: int, name: str, description: str | None, source_url: str | None) -> dict:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO series_proposals (proposed_by, name, description, source_url)
                VALUES (%s, %s, %s, %s)
                RETURNING *
                """,
                (proposed_by, name, description, source_url),
            )
            row = cur.fetchone()
        conn.commit()
    notify_owners("series_proposal_pending", {"proposal_id": row["id"], "name": name})
    return row


def get_pending_series_proposals() -> list[dict]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT sp.*, u.username AS proposed_by_username
                FROM series_proposals sp
                JOIN "User" u ON u.id = sp.proposed_by
                WHERE sp.status = 'pending'
                ORDER BY sp.created_at
                """
            )
            return cur.fetchall()


def approve_series_proposal(proposal_id: int, reviewed_by: int):
    from app.utils import series_utils

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM series_proposals WHERE id = %s", (proposal_id,))
            proposal = cur.fetchone()
    if proposal is None:
        raise ValueError("Proposal not found")
    if proposal["status"] != "pending":
        raise ValueError("Proposal already reviewed")

    try:
        series = series_utils.create_series(proposal["name"], _slugify(proposal["name"]), None)
    except Exception as e:
        raise ValueError("A series with this name already exists") from e

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE series_proposals
                SET status = 'approved', reviewed_by = %s, reviewed_at = now(), created_series_id = %s
                WHERE id = %s
                """,
                (reviewed_by, series.id, proposal_id),
            )
        conn.commit()
    return series


def reject_series_proposal(proposal_id: int, reviewed_by: int) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE series_proposals
                SET status = 'rejected', reviewed_by = %s, reviewed_at = now()
                WHERE id = %s AND status = 'pending'
                """,
                (reviewed_by, proposal_id),
            )
        conn.commit()

# ---------------------------------------------------------------------------
# Notifications — Json(payload) est obligatoire : psycopg3 refuse
# d'adapter un dict Python brut vers une colonne jsonb sans ce wrapper.
# ---------------------------------------------------------------------------

def notify(user_id: int, type_: str, payload: dict) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO notifications (user_id, type, payload) VALUES (%s, %s, %s)",
                (user_id, type_, Json(payload)),
            )
        conn.commit()


def notify_owners(type_: str, payload: dict) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT id FROM "User" WHERE role = \'owner\'')
            owner_ids = [row["id"] for row in cur.fetchall()]
    for uid in owner_ids:
        notify(uid, type_, payload)


def notify_mods_for_series(series_id: int, type_: str, payload: dict) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM mod_scopes WHERE series_id = %s AND active = true",
                (series_id,),
            )
            mod_ids = [row["user_id"] for row in cur.fetchall()]
    for uid in mod_ids:
        notify(uid, type_, payload)


def get_notifications_for_user(user_id: int, unread_only: bool = True) -> list[Notification]:
    query = "SELECT * FROM notifications WHERE user_id = %s"
    if unread_only:
        query += " AND read_at IS NULL"
    query += " ORDER BY created_at DESC"
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (user_id,))
            rows = cur.fetchall()
    return [Notification(**row) for row in rows]


def mark_notification_read(notification_id: int) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE notifications SET read_at = now() WHERE id = %s", (notification_id,))
        conn.commit()

def list_active_mod_scopes() -> list[dict]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ms.user_id, u.username, ms.series_id, s.name AS series_name, ms.granted_at
                FROM mod_scopes ms
                JOIN "User" u ON u.id = ms.user_id
                JOIN series s ON s.id = ms.series_id
                WHERE ms.active = true
                ORDER BY s.name, u.username
                """
            )
            return cur.fetchall()


def get_my_mod_series(user_id: int) -> list[dict]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT s.id, s.name, s.slug
                FROM mod_scopes ms JOIN series s ON s.id = ms.series_id
                WHERE ms.user_id = %s AND ms.active = true
                ORDER BY s.name
                """,
                (user_id,),
            )
            return cur.fetchall()


def get_open_disputes() -> list[dict]:
    """Une ligne par event contesté, avec la preuve du mod et la contre-preuve."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT e.id AS event_id, e.title,
                       rd.id AS dispute_id, rd.counter_evidence_url, rd.created_at AS disputed_at,
                       ru.username AS raised_by_username,
                       (SELECT evidence_url FROM event_resolution_log l
                        WHERE l.event_id = e.id ORDER BY l.resolved_at DESC LIMIT 1) AS mod_evidence_url,
                       (SELECT mu.username FROM event_resolution_log l JOIN "User" mu ON mu.id = l.resolved_by
                        WHERE l.event_id = e.id ORDER BY l.resolved_at DESC LIMIT 1) AS resolved_by_username
                FROM events e
                JOIN resolution_disputes rd ON rd.event_id = e.id AND rd.status = 'open'
                JOIN "User" ru ON ru.id = rd.raised_by
                WHERE e.status = 'disputed'
                ORDER BY rd.created_at
                """
            )
            rows = cur.fetchall()
            for row in rows:
                cur.execute(
                    "SELECT id, outcome, is_winner, pool_points FROM event_outcomes WHERE event_id = %s ORDER BY id",
                    (row["event_id"],),
                )
                row["outcomes"] = cur.fetchall()
    return rows


def resolve_dispute(event_id: int, resolved_by: int, decision: str, new_winning_outcome_id: int | None) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    "SELECT fn_resolve_dispute(%s::integer, %s::integer, %s::text, %s::integer)",
                    (event_id, resolved_by, decision, new_winning_outcome_id),
                )
            except Exception as e:
                conn.rollback()
                msg = getattr(getattr(e, "diag", None), "message_primary", None) or str(e)
                raise ValueError(msg) from e
        conn.commit()

def get_latest_resolution(event_id: int) -> dict | None:
    """Vue publique de la dernière résolution d'un event (pour la page joueur)."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT l.evidence_url, l.resolved_at, u.username AS resolved_by_username,
                       eo.outcome AS winning_outcome,
                       EXISTS (SELECT 1 FROM resolution_disputes d
                               WHERE d.event_id = l.event_id AND d.status = 'open') AS has_open_dispute
                FROM event_resolution_log l
                JOIN "User" u ON u.id = l.resolved_by
                JOIN event_outcomes eo ON eo.id = l.winning_outcome_id
                WHERE l.event_id = %s
                ORDER BY l.resolved_at DESC
                LIMIT 1
                """,
                (event_id,),
            )
            return cur.fetchone()