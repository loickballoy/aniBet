from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class EventOutcome(BaseModel):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    event_id: Optional[int] = None
    outcome: str
    pool_points: int = 0
    is_winner: bool = False


class Event(BaseModel):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    title: str
    description: Optional[str] = None
    series_id: Optional[int] = None
    # status: "open" | "locked" | "resolved" | "cancelled"
    status: str = "open"
    opens_at: Optional[datetime] = None
    locks_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    pool_total: int = 0
    # fee_bps: fee in basis points (e.g. 200 = 2%)
    fee_bps: int = 200
    cover_url: Optional[str] = None 
    created_by: Optional[int] = None


class EventWithOutcomes(Event):
    outcomes: list[EventOutcome] = []


class CreateEventRequest(BaseModel):
    title: str
    description: Optional[str] = None
    series_id: Optional[int] = None
    opens_at: Optional[datetime] = None
    locks_at: Optional[datetime] = None
    # 0–20 % : un fee négatif paierait plus que la cagnotte (AniCoins créés
    # de rien), un fee de 100 % confisquerait toutes les mises.
    fee_bps: int = Field(default=200, ge=0, le=2000)
    outcomes: list[str] = Field(max_length=20)  # list of outcome labels
    cover_url: Optional[str] = None 
    tag_ids: list[int] = []


class ReopenEventRequest(BaseModel):
    # Nouvelle date limite obligatoire : rouvrir sans date laisserait parier
    # indéfiniment, y compris après le prochain leak.
    locks_at: datetime


class ResolveEventRequest(BaseModel):
    winning_outcome_id: int
    evidence_url: str
    note: Optional[str] = None