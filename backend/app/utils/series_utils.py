from app.db import pool
from app.models.series import Series

UPDATABLE_FIELDS = {"name", "cover_url"}

def get_all_series() -> list[Series]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM series ORDER BY name')
            rows = cur.fetchall()
    return [Series(**row) for row in rows]

def get_series_by_id(series_id: int) -> Series | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM series WHERE id = %s', (series_id,))
            row = cur.fetchone()
    return Series(**row) if row else None

def get_series_by_slug(slug: str) -> Series | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM series WHERE slug = %s', (slug,))
            row = cur.fetchone()
    return Series(**row) if row else None

def create_series(name: str, slug: str, cover_url: str | None) -> Series:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'INSERT INTO series (name, slug, cover_url) VALUES (%s, %s, %s) RETURNING *',
                (name, slug, cover_url)
            )
            row = cur.fetchone()
        conn.commit()
    return Series(**row) if row else None

def delete_series(series_id: int):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'DELETE FROM series WHERE id = %s',
                (series_id,)
            )
        conn.commit()

def update_series(data: dict, series_id: int):
    fields = {k: v for k, v in data.items() if k in UPDATABLE_FIELDS and v is not None}
    if not fields:
        return

    set_clause = ", ".join(f"{col} = %s" for col in fields)
    params = list(fields.values()) + [series_id]

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f'UPDATE series SET {set_clause} WHERE id = %s',
                tuple(params)
            )
        conn.commit()
