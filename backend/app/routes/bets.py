from fastapi import APIRouter, Depends, HTTPException, status

from app.models.bet import Bet, PlaceBetRequest, BetWithDetails
from app.utils.auth_utils import user_dependency
from app.utils import bet_utils, auth_utils

BetsRouter = APIRouter(
    prefix="/bets", 
    tags=["bets"]
)

@BetsRouter.post("/", response_model=Bet, status_code=status.HTTP_201_CREATED)
async def place_bet(request: PlaceBetRequest, current_user: user_dependency):
    if request.points_placed <= 0:
        raise HTTPException(status_code=400, detail="points_placed must be positive")

    event = bet_utils.get_event_by_id(request.event_id)
    if not event:
        raise HTTPException(status_code=400, detail='Event not found')
    if event.status != "open":
        raise HTTPException(status_code=400, detail=f"Bets are closed for this event: {event.status}")

    outcome = bet_utils.get_outcome_by_id(request.outcome_id)
    if not outcome or outcome.event_id != request.event_id:
        raise HTTPException(status_code=400, detail=f"Outcome does not belong to this event")

    if bet_utils.user_already_bet(auth_utils.get_user_id(current_user.username), request.event_id):
        raise HTTPException(status_code=400, detail="User already placed a bet on this event")

    if current_user.points_balance < request.points_placed:
        raise HTTPException(status_code=400, detail="User does not have the funds to place such a bet!")

    bet = bet_utils.place_bet(auth_utils.get_user_id(current_user.username), request.outcome_id, request.points_placed)
    return bet

@BetsRouter.get("/me", response_model=list[BetWithDetails])
async def get_my_bets(current_user: user_dependency):
    bets = bet_utils.get_bets_by_user(auth_utils.get_user_id(current_user.username))
    result = []
    for bet in bets:
        outcome = bet_utils.get_outcome_by_id(bet.outcome_id)
        event = bet_utils.get_event_by_id(outcome.event_id)
        potential = None
        if event and event.status == "open":
            potential = bet_utils.calculate_potential_payout(
                bet.points_placed, bet.outcome_id, event
            )
        result.append(BetWithDetails(
            **bet.model_dump(),
            outcome_label=outcome.outcome if outcome else None,
            event_title=event.title,
            event_status=event.status,
            potential_payout=potential
        ))
    return result

@BetsRouter.get("/event/{event_id}/my", response_model=Bet | None)
async def get_my_bet_on_event(event_id: int, current_user: user_dependency):
    bets = bet_utils.get_bets_by_user(auth_utils.get_user_id(current_user.username))
    outcomes = bet_utils.get_outcomes_for_event(event_id)
    outcome_ids = {o.id for o in outcomes}
    for bet in bets:
        if bet.outcome_id in outcome_ids:
            return bet
    return None