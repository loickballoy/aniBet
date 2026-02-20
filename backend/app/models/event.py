from pydantic import BaseModel
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
    category: Optional[str] = None
    # status: "open" | "locked" | "resolved" | "cancelled"
    status: str = "open"
    opens_at: Optional[datetime] = None
    locks_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    pool_total: int = 0
    # fee_bps: fee in basis points (e.g. 200 = 2%)
    fee_bps: int = 200
    created_by: Optional[int] = None


class EventWithOutcomes(Event):
    outcomes: list[EventOutcome] = []


class CreateEventRequest(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    opens_at: Optional[datetime] = None
    locks_at: Optional[datetime] = None
    fee_bps: int = 200
    outcomes: list[str]  # list of outcome labels
    tag_ids: list[int] = []


class ResolveEventRequest(BaseModel):
    winning_outcome_id: int
    note: Optional[str] = None