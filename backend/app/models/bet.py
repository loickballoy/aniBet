from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class Bet(BaseModel):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    user_id: int
    outcome_id: int
    # status: "pending" | "won" | "lost" | "refunded"
    status: str = "pending"
    points_placed: int


class PlaceBetRequest(BaseModel):
    event_id: int
    outcome_id: int
    points_placed: int


class BetWithDetails(Bet):
    outcome_label: Optional[str] = None
    event_title: Optional[str] = None
    event_status: Optional[str] = None
    potential_payout: Optional[float] = None