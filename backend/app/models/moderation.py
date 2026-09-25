from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ModScope(BaseModel):
    id: Optional[int] = None
    user_id: int
    series_id: int
    granted_at: Optional[datetime] = None
    granted_by: Optional[int] = None
    active: bool = True


class GrantModScopeRequest(BaseModel):
    user_id: int
    series_id: int


class EventProposal(BaseModel):
    id: Optional[int] = None
    proposed_by: int
    title: str
    description: Optional[str] = None
    series_id: int
    outcomes: list[str]
    source_url: Optional[str] = None
    status: str = "pending"  # "pending" | "approved" | "rejected"
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ProposeEventRequest(BaseModel):
    title: str
    description: Optional[str] = None
    series_id: int
    outcomes: list[str]
    source_url: Optional[str] = None


class ApproveProposalRequest(BaseModel):
    opens_at: Optional[datetime] = None
    locks_at: Optional[datetime] = None
    fee_bps: int = 200
    cover_url: Optional[str] = None


class ResolutionDispute(BaseModel):
    id: Optional[int] = None
    event_id: int
    raised_by: int
    counter_evidence_url: str
    status: str = "open"  # "open" | "upheld_original" | "overturned"
    escalated_to: Optional[int] = None
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class RaiseDisputeRequest(BaseModel):
    counter_evidence_url: str


class Notification(BaseModel):
    id: Optional[int] = None
    user_id: int
    type: str
    payload: dict = {}
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

class ProposeSeriesRequest(BaseModel):
    name: str
    description: Optional[str] = None
    source_url: Optional[str] = None