from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class Series(BaseModel):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    name: str
    slug: str
    cover_url: Optional[str] = None

class CreateSeriesRequest(BaseModel):
    name: str
    slug: str
    cover_url: Optional[str] = None