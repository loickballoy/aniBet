"""
Leviers de croissance (docs/GROWTH_PLAN.md) : quête de démarrage, follows,
créateurs de paris, compteur de parties invité et métriques admin.
"""

from datetime import date as date_type

from app.db import pool

# ---------------------------------------------------------------------------
# Quête de démarrage : 4 étapes qui font découvrir tout le site en 5 minutes.
# Chaque condition est lue dans les tables existantes : rien à "déclarer".
# ---------------------------------------------------------------------------

STARTER_QUESTS = [
    {"key": "first_bet", "title": "Place your first bet", "reward": 500, "href": "/"},
    {"key": "first_game", "title": "Finish a daily or weekly game", "reward": 500, "href": "/daily"},
    {"key": "first_proposal", "title": "Propose a bet", "reward": 500, "href": "/propose"},
    {"key": "set_avatar", "title": "Set a profile picture", "reward": 500, "href": "/profile"},
]
QUESTS_BY_KEY = {q["key"]: q for q in STARTER_QUESTS}

_QUEST_CONDITIONS = {
    "first_bet": "SELECT EXISTS (SELECT 1 FROM bets WHERE user_id = %(uid)s)",
    "first_game": """
        SELECT EXISTS (SELECT 1 FROM daily_attempts WHERE user_id = %(uid)s AND result IS NOT NULL)
            OR EXISTS (SELECT 1 FROM weekly_attempts WHERE user_id = %(uid)s AND solved IS NOT NULL)
    """,
    "first_proposal": "SELECT EXISTS (SELECT 1 FROM event_proposals WHERE proposed_by = %(uid)s)",
    "set_avatar": 'SELECT pfp_url IS NOT NULL FROM "User" WHERE id = %(uid)s',
}


def get_starter_quests(user_id: int) -> list[dict]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT quest_key FROM quest_claims WHERE user_id = %s", (user_id,))
            claimed = {row["quest_key"] for row in cur.fetchall()}
            result = []
            for quest in STARTER_QUESTS:
                cur.execute(_QUEST_CONDITIONS[quest["key"]], {"uid": user_id})
                done = bool(next(iter(cur.fetchone().values())))
                result.append({**quest, "completed": done, "claimed": quest["key"] in claimed})
    return result


def claim_quest(user_id: int, quest_key: str) -> int:
    """Nouveau solde. ValueError si inconnue, pas terminée ou déjà réclamée."""
    quest = QUESTS_BY_KEY.get(quest_key)
    if quest is None:
        raise ValueError("Unknown quest")
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(_QUEST_CONDITIONS[quest_key], {"uid": user_id})
            if not next(iter(cur.fetchone().values())):
                raise ValueError("Quest not completed yet")
            try:
                cur.execute("SELECT fn_claim_quest(%s, %s, %s) AS balance", (user_id, quest_key, quest["reward"]))
                balance = cur.fetchone()["balance"]
            except Exception as e:
                conn.rollback()
                raise ValueError("Quest already claimed") from e
        conn.commit()
    return balance


# ---------------------------------------------------------------------------
# Créateurs de paris
# ---------------------------------------------------------------------------

PROPOSAL_APPROVED_REWARD = 500
CREATOR_CUT_BPS = 50  # 0,5 % de la cagnotte, plafonné au fee de l'event


def get_top_creators(limit: int = 20) -> list[dict]:
    """Classement des proposeurs : paris approuvés, puis volume total misé."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.username, u.pfp_url,
                       COUNT(e.id)::integer AS approved_markets,
                       COALESCE(SUM(e.pool_total), 0)::integer AS total_pool,
                       COALESCE((
                           SELECT SUM(pt.amount) FROM point_transactions pt
                           WHERE pt.user_id = u.id AND pt.kind IN ('creator_cut', 'proposal_approved')
                       ), 0)::integer AS creator_earnings
                FROM event_proposals p
                JOIN events e ON e.proposal_id = p.id
                JOIN "User" u ON u.id = p.proposed_by
                WHERE p.status = 'approved'
                GROUP BY u.id
                ORDER BY approved_markets DESC, total_pool DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()
    return [{**row, "rank": i + 1} for i, row in enumerate(rows)]


# ---------------------------------------------------------------------------
# Follows
# ---------------------------------------------------------------------------

def follow(follower_id: int, followee_id: int) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO follows (follower_id, followee_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (follower_id, followee_id),
            )
        conn.commit()


def unfollow(follower_id: int, followee_id: int) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM follows WHERE follower_id = %s AND followee_id = %s", (follower_id, followee_id))
        conn.commit()


def get_following_usernames(user_id: int) -> list[str]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.username FROM follows f JOIN "User" u ON u.id = f.followee_id
                WHERE f.follower_id = %s ORDER BY u.username
                """,
                (user_id,),
            )
            return [row["username"] for row in cur.fetchall()]


def get_following_leaderboard(user_id: int, season: dict | None) -> list[dict]:
    """Le joueur + ceux qu'il suit, classés comme le classement global
    (gain net de la saison s'il y en a une, sinon solde)."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            if season:
                cur.execute(
                    """
                    SELECT u.username, u.points_balance, u.pfp_url,
                           COALESCE(SUM(pt.amount), 0)::integer AS season_net_gain
                    FROM "User" u
                    LEFT JOIN point_transactions pt
                        ON pt.user_id = u.id AND pt.created_at >= %s AND pt.created_at <= %s
                    WHERE u.id = %s OR u.id IN (SELECT followee_id FROM follows WHERE follower_id = %s)
                    GROUP BY u.id
                    ORDER BY season_net_gain DESC
                    """,
                    (season["starts_at"], season["ends_at"], user_id, user_id),
                )
            else:
                cur.execute(
                    """
                    SELECT username, points_balance, pfp_url, NULL::integer AS season_net_gain
                    FROM "User"
                    WHERE id = %s OR id IN (SELECT followee_id FROM follows WHERE follower_id = %s)
                    ORDER BY points_balance DESC
                    """,
                    (user_id, user_id),
                )
            rows = cur.fetchall()
    return [{**row, "rank": i + 1} for i, row in enumerate(rows)]


# ---------------------------------------------------------------------------
# Parties en invité (agrégat anonyme par jour) et métriques admin
# ---------------------------------------------------------------------------

def record_guest_play(game: str) -> None:
    """Compte une partie invité terminée. Ne doit jamais faire échouer le jeu."""
    try:
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO guest_play_daily (day, game, plays) VALUES (%s, %s, 1)
                    ON CONFLICT (day, game) DO UPDATE SET plays = guest_play_daily.plays + 1
                    """,
                    (date_type.today(), game),
                )
            conn.commit()
    except Exception:
        pass


def _one(cur, sql: str, params: tuple = ()) -> float | int | None:
    cur.execute(sql, params)
    return next(iter(cur.fetchone().values()))


def _pct(part, whole) -> float | None:
    return round(100 * part / whole, 1) if whole else None


def get_growth_metrics() -> dict:
    """Les 5 indicateurs du plan de croissance, semaine en cours vs précédente."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            def window(sql: str) -> dict:
                # sql contient {start} et {end} en jours avant maintenant
                return {
                    "last_7d": _one(cur, sql.format(start=7, end=0)),
                    "prev_7d": _one(cur, sql.format(start=14, end=7)),
                }

            def between(col: str, start: int, end: int) -> str:
                return f"{col} >= now() - interval '{start} days' AND {col} < now() - interval '{end} days'"

            signups = window('SELECT COUNT(*) FROM "User" WHERE ' + between("created_at", "{start}", "{end}"))
            guest_plays = window(
                "SELECT COALESCE(SUM(plays), 0)::integer FROM guest_play_daily "
                "WHERE day > (now() - interval '{start} days')::date AND day <= (now() - interval '{end} days')::date"
            )
            bets_placed = window("SELECT COUNT(*) FROM bets WHERE " + between("created_at", "{start}", "{end}"))
            daily_completions = window(
                "SELECT COUNT(*) FROM daily_attempts WHERE result IS NOT NULL AND "
                + between("completed_at", "{start}", "{end}")
            )
            proposals_submitted = window(
                "SELECT COUNT(*) FROM event_proposals WHERE " + between("created_at", "{start}", "{end}")
            )
            proposals_approved = window(
                "SELECT COUNT(*) FROM event_proposals WHERE status = 'approved' AND "
                + between("reviewed_at", "{start}", "{end}")
            )

            # Nouveaux comptes (30 derniers jours, inscrits depuis > 24 h) ayant
            # parié dans leurs premières 24 h.
            cohort_24h = _one(cur, """
                SELECT COUNT(*) FROM "User"
                WHERE created_at >= now() - interval '30 days' AND created_at < now() - interval '1 day'
            """)
            first_bet_24h = _one(cur, """
                SELECT COUNT(*) FROM "User" u
                WHERE u.created_at >= now() - interval '30 days' AND u.created_at < now() - interval '1 day'
                  AND EXISTS (SELECT 1 FROM bets b WHERE b.user_id = u.id AND b.created_at <= u.created_at + interval '1 day')
            """)

            # Rétention J7 : comptes de 8 à 37 jours, encore actifs (pari ou
            # partie) 7 jours ou plus après leur inscription.
            cohort_d7 = _one(cur, """
                SELECT COUNT(*) FROM "User"
                WHERE created_at >= now() - interval '37 days' AND created_at < now() - interval '8 days'
            """)
            retained_d7 = _one(cur, """
                SELECT COUNT(*) FROM "User" u
                WHERE u.created_at >= now() - interval '37 days' AND u.created_at < now() - interval '8 days'
                  AND (
                    EXISTS (SELECT 1 FROM bets b WHERE b.user_id = u.id AND b.created_at >= u.created_at + interval '7 days')
                    OR EXISTS (SELECT 1 FROM daily_attempts d WHERE d.user_id = u.id AND d.created_at >= u.created_at + interval '7 days')
                    OR EXISTS (SELECT 1 FROM weekly_attempts w WHERE w.user_id = u.id AND w.created_at >= u.created_at + interval '7 days')
                  )
            """)

            avg_streak = _one(cur, "SELECT ROUND(AVG(current_streak)::numeric, 1)::float FROM streaks WHERE current_streak > 0")
            markets_30d = _one(cur, "SELECT COUNT(*) FROM events WHERE created_at >= now() - interval '30 days'")
            community_markets_30d = _one(
                cur, "SELECT COUNT(*) FROM events WHERE proposal_id IS NOT NULL AND created_at >= now() - interval '30 days'"
            )
            total_users = _one(cur, 'SELECT COUNT(*) FROM "User"')

    return {
        "total_users": total_users,
        "signups": signups,
        "guest_plays": guest_plays,
        "guest_to_signup_ratio": {
            k: _pct(signups[k], guest_plays[k]) for k in ("last_7d", "prev_7d")
        },
        "first_bet_within_24h": {"rate": _pct(first_bet_24h, cohort_24h), "cohort": cohort_24h},
        "d7_retention": {"rate": _pct(retained_d7, cohort_d7), "cohort": cohort_d7},
        "bets_placed": bets_placed,
        "daily_completions": daily_completions,
        "avg_active_streak": avg_streak,
        "proposals_submitted": proposals_submitted,
        "proposals_approved": proposals_approved,
        "community_market_share_30d": {
            "rate": _pct(community_markets_30d, markets_30d), "community": community_markets_30d, "total": markets_30d,
        },
    }
