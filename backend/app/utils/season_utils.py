"""
Saisons : le classement se base sur le gain net de la saison en cours, pas
sur le solde brut — sinon un nouveau joueur ne peut jamais rattraper un
vétéran. À la clôture, le classement final est figé (season_snapshots)
pour le Hall of Fame.
"""

from app.db import pool
from app.models.season import Season, SeasonSnapshot, HallOfFameEntry


def get_active_season() -> Season | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM seasons WHERE status = 'active' ORDER BY starts_at DESC LIMIT 1")
            row = cur.fetchone()
    return Season(**row) if row else None


def create_season(starts_at, ends_at) -> Season:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO seasons (starts_at, ends_at, status) VALUES (%s, %s, 'active') RETURNING *",
                (starts_at, ends_at),
            )
            row = cur.fetchone()
        conn.commit()
    return Season(**row)


def end_season(season_id: int) -> None:
    """
    Appelle fn_end_season() (calcule net_gain + rang pour chaque joueur en
    une transaction), puis remplit le tier de chaque snapshot créé — en
    deux temps volontairement : la logique des paliers (TIERS) vit côté
    Python (rank_utils.get_tier), pas question de la dupliquer en SQL.
    """
    from app.utils.rank_utils import get_tier  # import local : évite un cycle rank_utils <-> season_utils

    with pool.connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute("SELECT fn_end_season(%s)", (season_id,))
            except Exception as e:
                conn.rollback()
                raise ValueError(str(e)) from e
        conn.commit()

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, net_gain FROM season_snapshots WHERE season_id = %s", (season_id,))
            snapshots = cur.fetchall()
            for snap in snapshots:
                tier = get_tier(snap["net_gain"])
                cur.execute("UPDATE season_snapshots SET tier = %s WHERE id = %s", (tier, snap["id"]))
        conn.commit()


def get_season_leaderboard(season_id: int, limit: int = 20, offset: int = 0) -> list[SeasonSnapshot]:
    """Classement figé d'une saison terminée."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM season_snapshots
                WHERE season_id = %s
                ORDER BY final_rank ASC
                LIMIT %s OFFSET %s
                """,
                (season_id, limit, offset),
            )
            rows = cur.fetchall()
    return [SeasonSnapshot(**row) for row in rows]


def get_hall_of_fame() -> list[HallOfFameEntry]:
    """Une ligne par saison terminée, avec son champion (rang 1)."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT s.id as season_id, s.starts_at, s.ends_at,
                       u.username as champion_username, ss.net_gain as champion_net_gain
                FROM seasons s
                JOIN season_snapshots ss ON ss.season_id = s.id AND ss.final_rank = 1
                JOIN "User" u ON u.id = ss.user_id
                WHERE s.status = 'ended'
                ORDER BY s.ends_at DESC
                """
            )
            rows = cur.fetchall()
    return [HallOfFameEntry(**row) for row in rows]