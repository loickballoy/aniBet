"""
Classement : leaderboard paginé, rang d'un utilisateur donné, calcul du tier.

Bascule automatique : s'il existe une saison active, le classement et le
tier se calculent sur le gain net DEPUIS LE DÉBUT DE LA SAISON (somme des
point_transactions), pas sur le solde brut — sinon un nouveau joueur ne
peut jamais rattraper un vétéran qui joue depuis le début. Sans saison
active, comportement inchangé : classement par solde brut.
"""

from app.db import pool
from app.models.user import UserInLeaderboard
from app.setting import TIERS


def _get_active_season_window():
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, starts_at, ends_at FROM seasons WHERE status = 'active' ORDER BY starts_at DESC LIMIT 1"
            )
            return cur.fetchone()


def get_leaderboard(limit, offset):
    season = _get_active_season_window()
    if season:
        return _get_live_season_leaderboard(season, limit, offset)
    return _get_lifetime_leaderboard(limit, offset)


def _get_lifetime_leaderboard(limit, offset):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT username, points_balance FROM "User"
                WHERE role NOT IN ('admin', 'owner')
                ORDER BY points_balance DESC
                LIMIT %s OFFSET %s
                """,
                (limit, offset),
            )
            rows = cur.fetchall()

    leaderboard = [UserInLeaderboard(**row) for row in rows]
    for index, player in enumerate(leaderboard):
        player.rank = offset + index + 1
        player.tier = get_tier(player.points_balance)
    return leaderboard


def _get_live_season_leaderboard(season, limit, offset):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.username, u.points_balance,
                       COALESCE(SUM(pt.amount), 0)::integer AS season_net_gain
                FROM "User" u
                LEFT JOIN point_transactions pt
                    ON pt.user_id = u.id AND pt.created_at >= %s AND pt.created_at <= %s
                WHERE u.role NOT IN ('admin', 'owner')
                GROUP BY u.id
                ORDER BY season_net_gain DESC
                LIMIT %s OFFSET %s
                """,
                (season["starts_at"], season["ends_at"], limit, offset),
            )
            rows = cur.fetchall()

    leaderboard = [UserInLeaderboard(**row) for row in rows]
    for index, player in enumerate(leaderboard):
        player.rank = offset + index + 1
        player.tier = get_tier(player.season_net_gain)
    return leaderboard


def get_user_rank(current_user) -> int:
    season = _get_active_season_window()
    if season:
        return _get_user_season_rank(current_user, season)
    return _get_user_lifetime_rank(current_user)


def _get_user_lifetime_rank(current_user) -> int:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) AS count FROM "User"
                WHERE role NOT IN ('admin', 'owner') AND points_balance > %s
                """,
                (current_user.points_balance,),
            )
            row = cur.fetchone()
    return row["count"] + 1


def _get_user_season_rank(current_user, season) -> int:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            # Gain net de cet utilisateur sur la saison
            cur.execute(
                """
                SELECT COALESCE(SUM(amount), 0)::integer AS net_gain
                FROM point_transactions
                WHERE user_id = (SELECT id FROM "User" WHERE username = %s)
                  AND created_at >= %s AND created_at <= %s
                """,
                (current_user.username, season["starts_at"], season["ends_at"]),
            )
            my_net_gain = cur.fetchone()["net_gain"]

            # Combien d'utilisateurs ont un gain net strictement supérieur
            cur.execute(
                """
                SELECT COUNT(*) AS count FROM (
                    SELECT u.id, COALESCE(SUM(pt.amount), 0) AS net_gain
                    FROM "User" u
                    LEFT JOIN point_transactions pt
                        ON pt.user_id = u.id AND pt.created_at >= %s AND pt.created_at <= %s
                    WHERE u.role NOT IN ('admin', 'owner')
                    GROUP BY u.id
                    HAVING COALESCE(SUM(pt.amount), 0) > %s
                ) sub
                """,
                (season["starts_at"], season["ends_at"], my_net_gain),
            )
            row = cur.fetchone()
    return row["count"] + 1


def get_tier(points_balance: int):
    for tier in reversed(TIERS):
        if points_balance >= tier["min"]:
            return tier["name"]
    return "Iron"