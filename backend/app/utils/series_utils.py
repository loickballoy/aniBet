from app.db import get_supabase
from app.models.series import Series

def get_all_series() -> list[Series]:
    supabase = next(get_supabase())
    res = supabase.table("series").select("*").order("name").execute()
    return [Series(**row) for row in res.data]

def get_series_by_id(series_id: int) -> Series | None:
    supabase = next(get_supabase())
    res = supabase.table("series").select("*").eq("id", series_id).execute()
    return Series(**res.data[0]) if res.data else None

def get_series_by_slug(slug: str) -> Series | None:
    supabase = next(get_supabase())
    res = supabase.table("series").select("*").eq("slug", slug).execute()
    return Series(**res.data[0]) if res.data else None

def create_series(name: str, slug: str, cover_url: str | None) -> Series:
    supabase = next(get_supabase())
    res = supabase.table("series").insert({
        "name": name,
        "slug": slug,
        "cover_url": cover_url
    }).execute()
    return Series(**res.data[0])

def delete_series(series_id):
    supabase = next(get_supabase())
    supabase.table("series").delete().eq("id", series_id).execute()