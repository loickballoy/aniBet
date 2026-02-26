from datetime import datetime, UTC
from fastapi import APIRouter, HTTPException, status
from app.db import get_supabase
from app.models.bingo import *
from app.utils.auth_utils import user_dependency
from app.utils import bingo_utils, auth_utils

BingoRouter = APIRouter(prefix="/bingo", tags=["bingo"])

@BingoRouter.get("/", response_model=list[BingoCard])
async def list_cards(series_id: int | None = None):
    return bingo_utils.get_active_cards(series_id)

@BingoRouter.get("/{card_id}", response_model=BingoCard)
async def get_card(card_id: int):
    card = bingo_utils.get_bingo_card(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card

@BingoRouter.get("/{card_id}/items", response_model=list[BingoItem])
async def get_items(card_id: int):
    card = bingo_utils.get_bingo_card(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return bingo_utils.get_bingo_items(card_id)

@BingoRouter.get("/{card_id}/entry/me", response_model=BingoEntry | None)
async def get_my_entry(card_id: int, current_user: user_dependency):
    return bingo_utils.get_user_entry(auth_utils.get_user_id(current_user.username), card_id)

@BingoRouter.post("/{card_id}/entry", response_model=BingoEntry, status_code=status.HTTP_201_CREATED)
async def submit_entry(card_id: int, request: SubmitBingoEntryRequest, current_user: user_dependency):
    card = bingo_utils.get_bingo_card(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if card.status != "open":
        raise HTTPException(status_code=400, detail="Card is closed")
    if datetime.now(UTC) > card.closes_at.replace(tzinfo=UTC):
        raise HTTPException(status_code=400, detail="Submission period has closed")
    if len(request.selected_item_ids) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 items allowed")

    valid_ids = {item.id for item in bingo_utils.get_bingo_items(card_id)}
    if not all(iid in valid_ids for iid in request.selected_item_ids):
        raise HTTPException(status_code=400, detail="Invalid item ids")

    return bingo_utils.upsert_entry(
        auth_utils.get_user_id(current_user.username),
        card_id,
        request.selected_item_ids
    )

@BingoRouter.post("/", response_model=BingoCard, status_code=status.HTTP_201_CREATED)
async def create_card(request: CreateBingoCardRequest, current_user: user_dependency):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if len(request.items) < 2:
        raise HTTPException(status_code=400, detail="A card needs at least 2 items")

    supabase = next(get_supabase())
    card_res = supabase.table("bingo_cards").insert({
        "title": request.title,
        "series_id": request.series_id,
        "chapter_number": request.chapter_number,
        "opens_at": request.opens_at.isoformat(),
        "closes_at": request.closes_at.isoformat(),
        "cover_url": request.cover_url,
        "status": "open",
        "created_by": auth_utils.get_user_id(current_user.username)
    }).execute()
    card = BingoCard(**card_res.data[0])

    supabase.table("bingo_items").insert([
        {"card_id": card.id, "description": desc}
        for desc in request.items
    ]).execute()

    return card

@BingoRouter.post("/{card_id}/resolve", status_code=status.HTTP_200_OK)
async def resolve_card(card_id: int, request: ResolveBingoCardRequest, current_user: user_dependency):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    card = bingo_utils.get_bingo_card(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if card.status == "resolved":
        raise HTTPException(status_code=400, detail="Already resolved")

    bingo_utils.resolve_card(card_id, request.happened_item_ids)
    return {"message": "Bingo card resolved, rewards distributed"}