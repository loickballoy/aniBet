from app.db import pool
from app.models.user import UserInLeaderboard
from app.setting import TIERS

def get_leaderboard(limit, offset):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT username, points_balance FROM "User"
                WHERE role <> 'admin'
                ORDER BY points_balance DESC
                LIMIT %s OFFSET %s
                """,
                (limit, offset),
            )
            rows = cur.fetchall()

    leaderboard = [UserInLeaderboard(**row) for row in rows]
    for index in range(len(leaderboard)):
        player = leaderboard[index]
        player.rank = (offset + index + 1)
        player.tier = get_tier(player.points_balance)
    return leaderboard

def get_user_rank(current_user) -> int:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) AS count FROM "User"
                WHERE role <> 'admin' AND points_balance > %s
                """,
                (current_user.points_balance,)
            )
            row = cur.fetchone()
    return row["count"] + 1

def get_tier(points_balance: int):
    for tier in reversed(TIERS):
        if points_balance >= tier["min"]:
            return tier["name"]
    return "Iron"