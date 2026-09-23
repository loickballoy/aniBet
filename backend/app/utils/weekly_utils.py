"""
AniConnections : grille 4×4, 5 essais fixes, point final (pas d'extension
via pub — décision explicite, on ne monétise pas ce mécanisme).
"""

from datetime import date as date_type, timedelta

from psycopg.types.json import Json

from app.db import pool
from app.models.weekly import WeeklyConnections

WEEKLY_BASE_REWARD = 1000
MAX_MISTAKES = 5


def get_current_week_start() -> date_type:
    """Le dimanche de la semaine en cours (aujourd'hui inclus s'il tombe un dimanche)."""
    today = date_type.today()
    days_since_sunday = (today.weekday() + 1) % 7  # lundi=0 ... dimanche=6
    return today - timedelta(days=days_since_sunday)


def get_puzzle_for_week(week_of: date_type) -> WeeklyConnections | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, week_of, grid, created_at FROM weekly_connections WHERE week_of = %s",
                (week_of,),
            )
            row = cur.fetchone()
    return WeeklyConnections(**row) if row else None


def _get_categories_for_puzzle(puzzle_id: int) -> list[dict]:
    """Privé — jamais exposé via une route publique."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT categories FROM weekly_connections WHERE id = %s", (puzzle_id,))
            row = cur.fetchone()
    if row is None:
        raise ValueError("Puzzle not found")
    return row["categories"]


def create_puzzle(week_of: date_type, grid: list, categories: list) -> WeeklyConnections:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO weekly_connections (week_of, grid, categories)
                VALUES (%s, %s, %s)
                RETURNING id, week_of, grid, created_at
                """,
                (week_of, Json(grid), Json(categories)),
            )
            row = cur.fetchone()
        conn.commit()
    return WeeklyConnections(**row)


def get_existing_attempt(user_id: int, puzzle_id: int) -> dict | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM weekly_attempts WHERE user_id = %s AND puzzle_id = %s",
                (user_id, puzzle_id),
            )
            return cur.fetchone()


def submit_guess(user_id: int, puzzle_id: int, week_of: date_type, character_ids: list[int]) -> dict:
    if len(character_ids) != 4:
        raise ValueError("A guess must contain exactly 4 character ids")

    categories = _get_categories_for_puzzle(puzzle_id)
    existing = get_existing_attempt(user_id, puzzle_id)
    already_found = set(existing["found_categories"]) if existing else set()

    guess_set = set(character_ids)
    matched_label = None
    for cat in categories:
        if cat["label"] in already_found:
            continue  # ne pas re-matcher une catégorie déjà trouvée
        if set(cat["character_ids"]) == guess_set:
            matched_label = cat["label"]
            break

    is_correct = matched_label is not None

    with pool.connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    SELECT * FROM fn_submit_weekly_guess(
                        %s::integer, %s::integer, %s::date, %s::boolean, %s::text, %s::integer, %s::integer
                    )
                    """,
                    (user_id, puzzle_id, week_of, is_correct, matched_label, MAX_MISTAKES, WEEKLY_BASE_REWARD),
                )
                row = cur.fetchone()
            except Exception as e:
                conn.rollback()
                raise ValueError(str(e)) from e
        conn.commit()

    return {
        "guess_correct": is_correct,
        "matched_category": matched_label,
        "solved": row["solved"],
        "failed": row["failed"],
        "mistakes": row["mistakes"],
        "found_categories": row["found_categories"],
    }