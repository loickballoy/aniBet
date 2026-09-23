from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class Season(BaseModel):
    id: Optional[int] = None
    starts_at: datetime
    ends_at: datetime
    status: str = "upcoming"


class CreateSeasonRequest(BaseModel):
    starts_at: datetime
    ends_at: datetime


class SeasonSnapshot(BaseModel):
    id: Optional[int] = None
    season_id: int
    user_id: int
    net_gain: int
    final_rank: Optional[int] = None
    tier: Optional[str] = None
    created_at: Optional[datetime] = None


class HallOfFameEntry(BaseModel):
    season_id: int
    starts_at: datetime
    ends_at: datetime
    champion_username: str
    champion_net_gain: int