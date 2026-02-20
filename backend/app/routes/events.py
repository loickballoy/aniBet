from typing import Any
from fastapi import APIRouter, HTTPException, status

import app.utils.bet_utils as bet_utils
import app.utils.auth_utils as auth_utils
from app.models.event import *
from app.utils.auth_utils import user_dependency
from app.db import get_supabase

EventRouter = APIRouter(
    prefix="/events",
    tags=["events"]
)

@EventRouter.get('/', response_model=list[EventWithOutcomes])
async def list_events(status: str | None = None, limit: int = 20, offset: int = 0):
    """List events with their outcomes. Optionally filter by status (open/locked/resolved)."""
    events = bet_utils.get_events(status=status, limit=limit, offset=offset)
    result = []
    for event in events:
        outcomes = bet_utils.get_outcomes_for_event(event.id)
        result.append(EventWithOutcomes(**event.model_dump(), outcomes=outcomes))
    return result

@EventRouter.get('/{event_id}', response_model=EventWithOutcomes)
async def get_event(event_id: int):
    """Get details of a specific event by ID, including its outcomes."""
    events = bet_utils.get_events(limit=1, offset=0)
    event = next((e for e in events if e.id == event_id), None)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    outcomes = bet_utils.get_outcomes_for_event(event_id)
    return EventWithOutcomes(**event.model_dump(), outcomes=outcomes)

@EventRouter.post("/", response_model=EventWithOutcomes, status_code=status.HTTP_201_CREATED)
async def create_event(request: CreateEventRequest, current_user: user_dependency):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    if len(request.outcomes) < 2:
        raise HTTPException(status_code=400, detail="An event needs at least 2 outcomes")

    supabase = next(get_supabase())

    event_data = {
        "title": request.title,
        "description": request.description,
        "category": request.category,
        "opens_at": request.opens_at.isoformat() if request.opens_at else None,
        "locks_at": request.locks_at.isoformat() if request.locks_at else None,
        "fee_bps": request.fee_bps,
        "status": "open",
        "pool_total": 0,
        "created_by": auth_utils.get_user_id(current_user.username),
    }
    event_res = supabase.table("events").insert(event_data).execute()
    event = Event(**event_res.data[0])

    outcomes = []
    for label in request.outcomes:
        o_res = supabase.table("event_outcomes").insert(
            {"event_id": event.id, "outcome": label, "pool_points": 0, "is_winner": False}
        ).execute()
        outcomes.append(EventOutcome(**o_res.data[0]))

    # Attach tags
    if request.tag_ids:
        supabase.table("event_tags").insert(
            [{"event_id": event.id, "tags_id": tid} for tid in request.tag_ids]
        ).execute()

    return EventWithOutcomes(**event.model_dump(), outcomes=outcomes)

@EventRouter.post("/{event_id}/resolve", status_code=status.HTTP_200_OK)
async def resolve_event(event_id: int, request: ResolveEventRequest, current_user: user_dependency):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    event = bet_utils.get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status == "resolved":
        raise HTTPException(status_code=400, detail="Event already resolved")

    outcome = bet_utils.get_outcome_by_id(request.winning_outcome_id)
    if not outcome or outcome.event_id != event_id:
        raise HTTPException(status_code=400, detail="Outcome does not belong to this event")

    bet_utils.resolve_event(event_id, request.winning_outcome_id, auth_utils.get_user_id(current_user.username), request.note)
    return {"message": "Event resolved successfully"}


@EventRouter.patch("/{event_id}/lock", status_code=status.HTTP_200_OK)
async def lock_event(event_id: int, current_user: user_dependency):
    """Lock an event so no more bets can be placed."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    supabase = next(get_supabase())
    supabase.table("events").update({"status": "locked"}).eq("id", event_id).execute()
    return {"message": "Event locked"}