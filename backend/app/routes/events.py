from fastapi import APIRouter, HTTPException, status

from app.models.event import (
    Event, EventOutcome, EventWithOutcomes,
    CreateEventRequest, ResolveEventRequest,
)
from app.utils import auth_utils
from app.utils import bet_utils
from app.utils import trending_utils

user_dependency = auth_utils.user_dependency

EventRouter = APIRouter(
    prefix="/events",
    tags=["events"]
)


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
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
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
        created_by=auth_utils.get_user_id(current_user.username),
        outcome_labels=request.outcomes,
        tag_ids=request.tag_ids,
    )

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

    try:
        bet_utils.resolve_event(event_id, request.winning_outcome_id, auth_utils.get_user_id(current_user.username), request.note)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    return {"message": "Event resolved successfully"}


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