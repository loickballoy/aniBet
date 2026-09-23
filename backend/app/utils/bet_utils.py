"""
Logique de paris : lecture des events/outcomes/bets, placement d'un pari,
résolution d'un event.

IMPORTANT — place_bet() et resolve_event() n'exécutent plus la logique en
Python. Elles appellent fn_place_bet() / fn_resolve_event() (voir
migrations/002_functions.sql), qui s'exécutent chacune dans UNE SEULE
transaction Postgres avec verrous de ligne. L'ancienne version enchaînait
5 appels Supabase séparés malgré le commentaire "Atomically" — un crash entre
deux appels pouvait déduire les points d'un utilisateur sans jamais
enregistrer son pari. Les checks de validation (event existe, status "open",
solde suffisant...) restent dans routes/bets.py pour des messages d'erreur
précis côté utilisateur ; la fonction SQL refait les mêmes vérifications en
interne comme filet de sécurité contre une course entre deux requêtes
concurrentes — c'est elle qui a le dernier mot, pas la route.
"""

from app.db import pool
from app.models.bet import Bet
from app.models.event import Event, EventOutcome


# ---------------------------------------------------------------------------
# Event / outcome helpers — simples SELECT, pas de changement de logique
# ---------------------------------------------------------------------------

def get_outcomes_for_event(event_id: int) -> list[EventOutcome]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM event_outcomes WHERE event_id = %s', (event_id,))
            rows = cur.fetchall()
    return [EventOutcome(**row) for row in rows]


def get_events(status: str | None = None, series_id: int | None = None, limit: int = 20, offset: int = 0) -> list[Event]:
    # Construction dynamique du WHERE : on ajoute une condition et son
    # paramètre seulement si le filtre est fourni. Les %s restent la seule
    # façon dont une valeur entre dans la requête — jamais de f-string.
    conditions = []
    params: list = []
    if status:
        conditions.append("status = %s")
        params.append(status)
    if series_id:
        conditions.append("series_id = %s")
        params.append(series_id)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT * FROM events
        {where_clause}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
    return [Event(**row) for row in rows]


def get_event_by_id(event_id: int) -> Event | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM events WHERE id = %s', (event_id,))
            row = cur.fetchone()
    return Event(**row) if row else None


def get_outcome_by_id(outcome_id: int) -> EventOutcome | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM event_outcomes WHERE id = %s', (outcome_id,))
            row = cur.fetchone()
    return EventOutcome(**row) if row else None


# ---------------------------------------------------------------------------
# Bet helpers
# ---------------------------------------------------------------------------

def get_bets_by_user(user_id: int) -> list[Bet]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM bets WHERE user_id = %s', (user_id,))
            rows = cur.fetchall()
    return [Bet(**row) for row in rows]


def get_bets_by_outcome(outcome_id: int) -> list[Bet]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM bets WHERE outcome_id = %s', (outcome_id,))
            rows = cur.fetchall()
    return [Bet(**row) for row in rows]


def user_already_bet(user_id: int, event_id: int) -> bool:
    outcomes = get_outcomes_for_event(event_id)
    outcome_ids = [o.id for o in outcomes]
    if not outcome_ids:
        return False
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id FROM bets
                WHERE user_id = %s AND outcome_id = ANY(%s) AND status <> 'refunded'
                """,
                (user_id, outcome_ids),
            )
            rows = cur.fetchall()
    return len(rows) > 0


# ---------------------------------------------------------------------------
# Payout logic — calcul pur, aucun accès DB, inchangé
# ---------------------------------------------------------------------------

def calculate_payout(points_placed: int, outcome_pool: int, event_pool: int, fee_bps: int) -> float:
    if outcome_pool == 0:
        return 0
    gross_payout = (points_placed / outcome_pool) * event_pool
    net = gross_payout * (1 - fee_bps / 10000)
    return int(net)


def calculate_potential_payout(points_placed: int, outcome_id: int, event: Event):
    outcome = get_outcome_by_id(outcome_id)
    if not outcome:
        return points_placed

    projected_outcome_pool = outcome.pool_points + points_placed
    projected_total_pool = event.pool_total + points_placed
    return calculate_payout(points_placed, projected_outcome_pool, projected_total_pool, event.fee_bps)


# ---------------------------------------------------------------------------
# Core — maintenant de vraies transactions Postgres, pas du Python enchaîné
# ---------------------------------------------------------------------------

def create_event(title: str, description: str | None, series_id: int | None,
                  opens_at, locks_at, fee_bps: int, cover_url: str | None,
                  created_by: int, outcome_labels: list[str], tag_ids: list[int]) -> Event:
    """
    Insère l'event, ses outcomes et ses tags dans la même connexion —
    avant, c'étaient 3 appels Supabase séparés directement dans la route ;
    un échec au 2e ou 3e appel laissait un event orphelin sans outcomes.
    """
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO events (title, description, series_id, opens_at, locks_at, fee_bps, cover_url, status, pool_total, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'open', 0, %s)
                RETURNING *
                """,
                (title, description, series_id, opens_at, locks_at, fee_bps, cover_url, created_by),
            )
            event_row = cur.fetchone()
            event_id = event_row["id"]

            cur.executemany(
                'INSERT INTO event_outcomes (event_id, outcome) VALUES (%s, %s)',
                [(event_id, label) for label in outcome_labels],
            )

            if tag_ids:
                cur.executemany(
                    'INSERT INTO event_tags (event_id, tags_id) VALUES (%s, %s) ON CONFLICT DO NOTHING',
                    [(event_id, tid) for tid in tag_ids],
                )

            cur.execute('SELECT * FROM event_outcomes WHERE event_id = %s', (event_id,))
            outcome_rows = cur.fetchall()
        conn.commit()

    return Event(**event_row), [EventOutcome(**row) for row in outcome_rows]


def lock_event(event_id: int) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE events SET status = 'locked' WHERE id = %s", (event_id,))
        conn.commit()


def place_bet(user_id: int, outcome_id: int, points_placed: int) -> Bet:
    """
    Appelle fn_place_bet(), qui dans UNE transaction : verrouille le solde
    utilisateur, vérifie le pari existant/le solde/le statut de l'event,
    déduit les points, insère le pari, met à jour les deux pools, journalise
    la transaction. Si Postgres lève une exception (ex: solde insuffisant
    détecté au niveau SQL malgré le check déjà fait côté route — cas rare
    de course entre deux requêtes concurrentes), elle remonte ici comme
    ValueError avec le message exact.
    """
    with pool.connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    'SELECT * FROM fn_place_bet(%s, %s, %s)',
                    (user_id, outcome_id, points_placed),
                )
                row = cur.fetchone()
            except Exception as e:
                conn.rollback()
                raise ValueError(str(e)) from e
        conn.commit()

    bet_id = row["bet_id"]
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM bets WHERE id = %s', (bet_id,))
            bet_row = cur.fetchone()
    return Bet(**bet_row)


def resolve_event(event_id: int, winning_outcome_id: int, resolved_by: int, note: str | None = None):
    """
    Appelle fn_resolve_event(), qui dans UNE transaction : verrouille
    l'event, marque l'outcome gagnant, calcule et crédite chaque payout
    gagnant, marque les paris perdants, journalise la résolution.
    """
    with pool.connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    'SELECT fn_resolve_event(%s, %s, %s, %s)',
                    (event_id, winning_outcome_id, resolved_by, note),
                )
            except Exception as e:
                conn.rollback()
                raise ValueError(str(e)) from e
        conn.commit()

def mark_resolution(event_id: int, winning_outcome_id: int, resolved_by: int, evidence_url: str):
    """
    Appelle fn_mark_resolution() : vérifie que resolved_by est mod pour la
    série de cet event, marque l'event "resolved_pending_dispute", marque
    l'outcome gagnant, journalise avec la preuve. NE PAIE PERSONNE — c'est
    finalize_payout() qui s'en charge, après la fenêtre de dispute.
    """
    with pool.connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    'SELECT fn_mark_resolution(%s, %s, %s, %s)',
                    (event_id, winning_outcome_id, resolved_by, evidence_url),
                )
            except Exception as e:
                conn.rollback()
                raise ValueError(str(e)) from e
        conn.commit()


def finalize_payout(event_id: int):
    """
    Appelle fn_finalize_payout() : paie tous les paris gagnants, marque les
    perdants. Refuse si l'event n'est pas en "resolved_pending_dispute" ou
    si une dispute est encore ouverte dessus.
    """
    with pool.connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute('SELECT fn_finalize_payout(%s)', (event_id,))
            except Exception as e:
                conn.rollback()
                raise ValueError(str(e)) from e
        conn.commit()


def raise_dispute(event_id: int, user_id: int, counter_evidence_url: str) -> int:
    """
    Appelle fn_raise_dispute() : passe l'event en "disputed", bloquant
    finalize_payout() jusqu'à ce que le litige soit levé (résolution
    manuelle par un owner/second reviewer, hors scope de cette fonction).
    """
    with pool.connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    'SELECT fn_raise_dispute(%s, %s, %s)',
                    (event_id, user_id, counter_evidence_url),
                )
                dispute_id = cur.fetchone()["fn_raise_dispute"]
            except Exception as e:
                conn.rollback()
                raise ValueError(str(e)) from e
        conn.commit()
    return dispute_id