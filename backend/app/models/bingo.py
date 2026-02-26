from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class BingoCard(BaseModel):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    title: str
    series_id: Optional[int] = None
    chapter_number: Optional[int] = None
    opens_at: datetime
    closes_at: datetime
    status: str = "open"
    cover_url: Optional[str] = None
    created_by: Optional[int] = None

class BingoItem(BaseModel):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    card_id: int
    description: str
    did_happen: Optional[bool] = None

class BingoEntry(BaseModel):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    user_id: int
    card_id: int
    selected_item_ids: list[int] = []
    score: Optional[int] = None
    coins_earned: Optional[int] = None

class CreateBingoCardRequest(BaseModel):
    title: str
    series_id: Optional[int] = None
    chapter_number: Optional[int] = None
    opens_at: datetime
    closes_at: datetime
    cover_url: Optional[str] = None
    items: list[str]

class SubmitBingoEntryRequest(BaseModel):
    selected_item_ids: list[int]

class ResolveBingoCardRequest(BaseModel):
    happened_item_ids: list[int]