from datetime import datetime, timedelta, UTC

from fastapi import APIRouter, HTTPException, status

from app.models.event import (
    Event, EventOutcome, EventWithOutcomes,
    CreateEventRequest, ResolveEventRequest,
)
from app.models.moderation import RaiseDisputeRequest

from app.utils import auth_utils
from app.utils import bet_utils
from app.utils import trending_utils
from app.utils import moderation_utils

user_dependency = auth_utils.user_dependency

EventRouter = APIRouter(
    prefix="/events",
    tags=["events"]
)

DISPUTE_WINDOW=timedelta(hours=30)

@EventRouter.get('/trending', response_model=list[EventWithOutcomes])
async def get_trending_events():
    return trending_utils.get_trending_events()


@EventRouter.get('/', response_model=list[EventWithOutcomes])
async def list_events(status: str | None = None, series_id: int | None = None, limit: int = 20, offset: int = 0):
    events = bet_utils.get_events(status=status, series_id=series_id, limit=limit, offset=offset)
    result = []
    for event in events:
        outcomes = bet_utils.get_outcomes_for_event(event.id)
        result.append(EventWithOutcomes(**event.model_dump(), outcomes=outcomes))
    return result


@EventRouter.get('/{event_id}', response_model=EventWithOutcomes)
async def get_event(event_id: int):
    event = bet_utils.get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    outcomes = bet_utils.get_outcomes_for_event(event_id)
    return EventWithOutcomes(**event.model_dump(), outcomes=outcomes)


@EventRouter.post("/", response_model=EventWithOutcomes, status_code=status.HTTP_201_CREATED)
async def create_event(request: CreateEventRequest, current_user: user_dependency):
    user_id = auth_utils.get_user_id(current_user.username)
    is_authorized = (
        current_user.role in ("admin", "owner")
        or (request.series_id is not None and moderation_utils.is_mod_for_series(user_id, request.series_id))
    )
    if not is_authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only, or a mod for this series")
    if len(request.outcomes) < 2:
        raise HTTPException(status_code=400, detail="An event needs at least 2 outcomes")

    event, outcomes = bet_utils.create_event(
        title=request.title,
        description=request.description,
        series_id=request.series_id,
        opens_at=request.opens_at,
        locks_at=request.locks_at,
        fee_bps=request.fee_bps,
        cover_url=request.cover_url,
        created_by=user_id,
        outcome_labels=request.outcomes,
        tag_ids=request.tag_ids,
    )

    return EventWithOutcomes(**event.model_dump(), outcomes=outcomes)

@EventRouter.post("/{event_id}/resolve", status_code=status.HTTP_200_OK)
async def resolve_event(event_id: int, request: ResolveEventRequest, current_user: user_dependency):
    event = bet_utils.get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    is_authorized = (
        current_user.role in ("admin", "owner")
        or moderation_utils.is_mod_for_series(auth_utils.get_user_id(current_user.username), event.series_id)
    )
    if not is_authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a mod for this event's series")

    if event.status not in ("open", "locked"):
        raise HTTPException(status_code=400, detail=f"Event cannot be resolved (status: {event.status})")

    outcome = bet_utils.get_outcome_by_id(request.winning_outcome_id)
    if not outcome or outcome.event_id != event_id:
        raise HTTPException(status_code=400, detail="Outcome does not belong to this event")

    try:
        bet_utils.mark_resolution(
            event_id, request.winning_outcome_id,
            auth_utils.get_user_id(current_user.username), request.evidence_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return {"message": "Event resolved, dispute window open"}

@EventRouter.get("/{event_id}/resolution")
async def get_resolution(event_id: int):
    """Public : qui a résolu, avec quelle preuve, et quand la fenêtre de dispute se ferme."""
    res = moderation_utils.get_latest_resolution(event_id)
    if not res:
        return None
    resolved_at = res["resolved_at"] if res["resolved_at"].tzinfo else res["resolved_at"].replace(tzinfo=UTC)
    return {**res, "dispute_window_ends_at": (resolved_at + DISPUTE_WINDOW).isoformat()}

@EventRouter.post("/{event_id}/dispute", status_code=status.HTTP_201_CREATED)
async def dispute_event(event_id: int, request: RaiseDisputeRequest, current_user: user_dependency):
    try:
        dispute_id = bet_utils.raise_dispute(
            event_id, auth_utils.get_user_id(current_user.username), request.counter_evidence_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"dispute_id": dispute_id}


@EventRouter.post("/{event_id}/finalize-payout", status_code=status.HTTP_200_OK)
async def finalize_payout(event_id: int, current_user: user_dependency):
    event = bet_utils.get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    is_authorized = (
        current_user.role in ("admin", "owner")
        or moderation_utils.is_mod_for_series(auth_utils.get_user_id(current_user.username), event.series_id)
    )
    if not is_authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a mod for this event's series")

    if current_user.role not in ("admin", "owner") and event.resolved_at is not None:
        resolved_at = event.resolved_at if event.resolved_at.tzinfo else event.resolved_at.replace(tzinfo=UTC)
        opens_at = resolved_at + DISPUTE_WINDOW
        if datetime.now(UTC) < opens_at:
            hours_left = int((opens_at - datetime.now(UTC)).total_seconds() // 3600) + 1
            raise HTTPException(status_code=409, detail=f"Dispute window still open — payout available in ~{hours_left}h")

    try:
        bet_utils.finalize_payout(event_id)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return {"message": "Payout finalized"}

@EventRouter.patch("/{event_id}/lock", status_code=status.HTTP_200_OK)
async def lock_event(event_id: int, current_user: user_dependency):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    bet_utils.lock_event(event_id)
    return {"message": "Event locked"}


@EventRouter.post("/{event_id}/admin-carousel", status_code=status.HTTP_201_CREATED)
async def add_to_admin_carousel(event_id: int, current_user: user_dependency):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    event = bet_utils.get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if trending_utils.has_admin_carousel_tag(event_id):
        raise HTTPException(status_code=409, detail="Event is already pinned to admin carousel")

    trending_utils.add_admin_carousel(event_id)
    return {"message": f"Event {event_id} pinned to admin carousel"}


@EventRouter.delete("/{event_id}/admin-carousel", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_admin_carousel(event_id: int, current_user: user_dependency):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    if not trending_utils.has_admin_carousel_tag(event_id):
        raise HTTPException(status_code=404, detail="Event is not in admin carousel")

    trending_utils.remove_admin_carousel(event_id)