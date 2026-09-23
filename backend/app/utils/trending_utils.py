"""
Carousel de la home : events mis en avant manuellement par un admin
("admin_carousel", toujours affichés en premier) + les events les plus
actifs pour remplir les places restantes ("carousel", recalculé à chaque
appel).

OPTIMISATION PAR RAPPORT À L'ORIGINAL
--------------------------------------
L'ancienne version faisait ~15 allers-retours Supabase séparés pour une
seule requête de trending : un fetch de tous les events, un fetch de TOUS
les bets pour compter côté Python, puis une requête par event pour ses
outcomes (le classique problème "N+1 requêtes" — 1 requête pour la liste,
puis N requêtes, une par élément de la liste). Ici, Postgres fait le
comptage et les jointures nativement avec GROUP BY et WHERE ... = ANY(...),
ce qui ramène ça à une poignée de requêtes au lieu d'une par event.
"""

from app.db import pool
from app.models.event import Event, EventOutcome, EventWithOutcomes

TRENDING_LIMIT = 5
CAROUSEL_TAG_NAME = "carousel"
ADMIN_CAROUSEL_TAG_NAME = "admin_carousel"


def _get_or_create_tag_id(cur, name: str) -> int:
    """
    "Get or create" en une seule requête grâce à la contrainte UNIQUE sur
    tags.label posée dans le schéma : INSERT ... ON CONFLICT DO UPDATE
    renvoie toujours la ligne (existante ou nouvelle) via RETURNING, alors
    qu'un ON CONFLICT DO NOTHING ne renverrait rien si la ligne existait déjà.
    """
    cur.execute(
        """
        INSERT INTO tags (label) VALUES (%s)
        ON CONFLICT (label) DO UPDATE SET label = EXCLUDED.label
        RETURNING id
        """,
        (name,),
    )
    return cur.fetchone()["id"]


def get_trending_events() -> list[EventWithOutcomes]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            carousel_tag_id = _get_or_create_tag_id(cur, CAROUSEL_TAG_NAME)
            admin_carousel_tag_id = _get_or_create_tag_id(cur, ADMIN_CAROUSEL_TAG_NAME)

            # --- Events déjà épinglés en admin_carousel ---
            cur.execute(
                'SELECT event_id FROM event_tags WHERE tags_id = %s',
                (admin_carousel_tag_id,),
            )
            admin_carousel_ids = {row["event_id"] for row in cur.fetchall()}

            # --- Events ouverts + leur nombre de paris, en une requête ---
            # (remplace le fetch de tous les events + fetch de tous les bets
            # + comptage manuel en Python de l'original)
            cur.execute(
                """
                SELECT e.*, COUNT(b.id) AS bet_count
                FROM events e
                LEFT JOIN event_outcomes eo ON eo.event_id = e.id
                LEFT JOIN bets b ON b.outcome_id = eo.id
                WHERE e.status = 'open'
                GROUP BY e.id
                """
            )
            open_events_rows = cur.fetchall()

            def score(row) -> float:
                return row["pool_total"] * 0.6 + row["bet_count"] * 0.4

            non_admin_rows = [r for r in open_events_rows if r["id"] not in admin_carousel_ids]
            sorted_rows = sorted(non_admin_rows, key=score, reverse=True)

            remaining_slots = max(0, TRENDING_LIMIT - len(admin_carousel_ids))
            trending_rows = sorted_rows[:remaining_slots]
            trending_ids = {r["id"] for r in trending_rows}

            # --- Reset des tags carousel (jamais les admin_carousel) ---
            # Un DELETE en masse au lieu d'une boucle avec un DELETE par ligne.
            # event_id <> ALL(%s) avec une liste vide exclut rien, donc tout
            # est supprimé si aucun admin_carousel n'existe — comportement
            # voulu, pas besoin de cas particulier.
            cur.execute(
                """
                DELETE FROM event_tags
                WHERE tags_id = %s AND event_id <> ALL(%s)
                """,
                (carousel_tag_id, list(admin_carousel_ids) or [0]),
            )

            # --- Tag des nouveaux trending events ---
            # ON CONFLICT DO NOTHING fonctionne car event_tags a une clé
            # primaire composite (event_id, tags_id) dans le schéma.
            if trending_ids:
                cur.executemany(
                    """
                    INSERT INTO event_tags (event_id, tags_id) VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    [(eid, carousel_tag_id) for eid in trending_ids],
                )

            # --- Events admin_carousel complets (n'importe quel statut) ---
            admin_events: list[Event] = []
            if admin_carousel_ids:
                cur.execute(
                    'SELECT * FROM events WHERE id = ANY(%s)',
                    (list(admin_carousel_ids),),
                )
                admin_events = [Event(**row) for row in cur.fetchall()]

            trending_events = [Event(**{k: v for k, v in r.items() if k != "bet_count"}) for r in trending_rows]
            all_events = admin_events + trending_events
            all_ids = [e.id for e in all_events]

            # --- Tous les outcomes en une requête, plutôt qu'une par event ---
            outcomes_by_event: dict[int, list[EventOutcome]] = {}
            if all_ids:
                cur.execute(
                    'SELECT * FROM event_outcomes WHERE event_id = ANY(%s)',
                    (all_ids,),
                )
                for row in cur.fetchall():
                    outcomes_by_event.setdefault(row["event_id"], []).append(EventOutcome(**row))

        conn.commit()  # les tags ont été modifiés plus haut

    return [
        EventWithOutcomes(**event.model_dump(), outcomes=outcomes_by_event.get(event.id, []))
        for event in all_events
    ]


def add_admin_carousel(event_id: int) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            admin_carousel_tag_id = _get_or_create_tag_id(cur, ADMIN_CAROUSEL_TAG_NAME)
            cur.execute(
                """
                INSERT INTO event_tags (event_id, tags_id) VALUES (%s, %s)
                ON CONFLICT DO NOTHING
                """,
                (event_id, admin_carousel_tag_id),
            )
        conn.commit()


def remove_admin_carousel(event_id: int) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            admin_carousel_tag_id = _get_or_create_tag_id(cur, ADMIN_CAROUSEL_TAG_NAME)
            cur.execute(
                'DELETE FROM event_tags WHERE event_id = %s AND tags_id = %s',
                (event_id, admin_carousel_tag_id),
            )
        conn.commit()


def has_admin_carousel_tag(event_id: int) -> bool:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            admin_carousel_tag_id = _get_or_create_tag_id(cur, ADMIN_CAROUSEL_TAG_NAME)
            cur.execute(
                'SELECT 1 FROM event_tags WHERE event_id = %s AND tags_id = %s',
                (event_id, admin_carousel_tag_id),
            )
            row = cur.fetchone()
        conn.commit()  # _get_or_create_tag_id peut avoir créé le tag
    return row is not None