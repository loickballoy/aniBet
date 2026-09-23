from app.db import pool
from app.models.user import User

def db_insert(user: User):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "User" (username, google_sub, discord_id, email, role, is_banned, points_balance, pfp_url, password_hash)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    user.username,
                    user.google_sub,
                    user.discord_id,
                    user.email,
                    user.role,
                    user.is_banned,
                    user.points_balance,
                    user.pfp_url,
                    getattr(user, "password_hash", None)
                )
            )
        conn.commit()