from app.db import pool
from app.models.bingo import BingoCard, BingoItem, BingoEntry

REWARD_PER_HIT = 500

def get_bingo_card(card_id: int) -> BingoCard | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM bingo_cards WHERE id = %s', (card_id,))
            row = cur.fetchone()
    return BingoCard(**row) if row else None

def get_bingo_items(card_id: int) -> list[BingoItem]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM bingo_items WHERE card_id = %s', (card_id,))
            rows = cur.fetchall()
    return [BingoItem(**row) for row in rows]

def get_active_cards(series_id: int | None) -> list[BingoCard]:
    query = 'SELECT * FROM bingo_cards WHERE status = %s'
    params: list = ['open']

    if series_id:
        query += ' AND series_id = %s'
        params.append(series_id)
    query += ' ORDER BY closes_at'

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
    return [BingoCard(**row) for row in rows]

def get_user_entry(user_id: int, card_id: int) -> BingoEntry | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT * FROM bingo_entries WHERE user_id = %s AND card_id = %s',
                (user_id, card_id),
            )
            row = cur.fetchone()
    return BingoEntry(**row) if row else None

def upsert_entry(user_id: int, card_id: int, selected_item_ids: list[int]) -> BingoEntry:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO bingo_entries (user_id, card_id, selected_item_ids)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, card_id)
                DO UPDATE SET selected_item_ids = EXCLUDED.selected_item_ids
                RETURNING *
                """,
                (user_id, card_id, selected_item_ids)
            )
            row = cur.fetchone()
        conn.commit()
    return BingoEntry(**row)

def create_bingo_card(title: str, series_id: int | None, chapter_number: int | None,
                     opens_at, closes_at, cover_url: str | None,
                     created_by: int, item_descriptions: list[str]) -> BingoCard:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO bingo_cards (title, series_id, chapter_number, opens_at, closes_at, cover_url, status, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, 'open', %s)
                RETURNING *                
                """,
                (title, series_id, chapter_number, opens_at, closes_at, cover_url, created_by),
            )
            card_row = cur.fetchone()

            cur.executemany(
                'INSERT INTO bingo_items (card_id, description) VALUES (%s, %s)',
                [(card_row["id"], desc) for desc in item_descriptions]
            )
        conn.commit()
    return BingoCard(**card_row)

def resolve_card(card_id: int, happened_item_ids: list[int]):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    'SELECT fn_resolve_bingo_card(%s, %s, %s)',
                    (card_id, happened_item_ids, REWARD_PER_HIT)
                )
            except Exception as e:
                conn.rollback()
                raise ValueError(str(e)) from e
        conn.commit()

        