from app.db import get_supabase
from app.models.bingo import BingoCard, BingoItem, BingoEntry

REWARD_PER_HIT = 500

def get_bingo_card(card_id: int) -> BingoCard | None:
    supabase = next(get_supabase())
    res = supabase.table("bingo_cards").select("*").eq("id", card_id).execute()
    return BingoCard(**res.data[0]) if res.data else None

def get_bingo_items(card_id: int) -> list[BingoItem]:
    supabase = next(get_supabase())
    res = supabase.table("bingo_items").select("*").eq("card_id", card_id).execute()
    return [BingoItem(**row) for row in res.data]

def get_active_cards(series_id: int | None = None) -> list[BingoCard]:
    supabase = next(get_supabase())
    query = supabase.table("bingo_cards").select("*").eq("status", "open").order("closes_at")
    if series_id:
        query = query.eq("series_id", series_id)
    return [BingoCard(**row) for row in query.execute().data]

def get_user_entry(user_id: int, card_id: int) -> BingoEntry | None:
    supabase = next(get_supabase())
    res = supabase.table("bingo_entries").select("*").eq("user_id", user_id).eq("card_id", card_id).execute()
    return BingoEntry(**res.data[0]) if res.data else None

def upsert_entry(user_id: int, card_id: int, selected_item_ids: list[int]) -> BingoEntry:
    supabase = next(get_supabase())
    existing = get_user_entry(user_id, card_id)
    if existing:
        supabase.table("bingo_entries").update(
            {"selected_item_ids": selected_item_ids}
        ).eq("id", existing.id).execute()
    else:
        supabase.table("bingo_entries").insert({
            "user_id": user_id,
            "card_id": card_id,
            "selected_item_ids": selected_item_ids
        }).execute()
    return get_user_entry(user_id, card_id)

def resolve_card(card_id: int, happened_item_ids: list[int]):
    supabase = next(get_supabase())

    items = get_bingo_items(card_id)
    for item in items:
        supabase.table("bingo_items").update(
            {"did_happen": item.id in happened_item_ids}
        ).eq("id", item.id).execute()

    entries_res = supabase.table("bingo_entries").select("*").eq("card_id", card_id).execute()
    for row in entries_res.data:
        entry = BingoEntry(**row)
        hits = len(set(entry.selected_item_ids) & set(happened_item_ids))
        coins = hits * REWARD_PER_HIT
        supabase.table("bingo_entries").update(
            {"score": hits, "coins_earned": coins}
        ).eq("id", entry.id).execute()
        if coins > 0:
            supabase.rpc("add_user_points", {"p_user_id": entry.user_id, "p_amount": coins}).execute()
            supabase.table("point_transactions").insert({
                "user_id": entry.user_id,
                "kind": "bingo_reward",
                "amount": coins,
                "reference_type": "bingo_entry",
                "reference_id": entry.id
            }).execute()

    supabase.table("bingo_cards").update({"status": "resolved"}).eq("id", card_id).execute()