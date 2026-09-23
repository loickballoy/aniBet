from datetime import date as date_type
from fastapi import APIRouter, HTTPException, status

from app.models.daily import (
    DailyChallenge, CreateDailyChallengeRequest,
    TriviaSubmitRequest, SilhouetteGuessRequest, Streak,
)
from app.utils import auth_utils
from app.utils import daily_utils

user_dependency = auth_utils.user_dependency

DailyRouter = APIRouter(tags=["daily"])


@DailyRouter.get("/daily-challenges/today")
async def get_todays_challenge(current_user: user_dependency):
    today = date_type.today()
    challenge = daily_utils.get_challenge_for_date(today)
    if not challenge:
        raise HTTPException(status_code=404, detail="No challenge scheduled for today")

    user_id = auth_utils.get_user_id(current_user.username)
    attempt = daily_utils.get_existing_attempt(user_id, challenge.id)

    return {
        "challenge": challenge,
        "attempt": attempt,  # None si jamais tenté, sinon l'état actuel (utile pour la silhouette en cours)
    }


@DailyRouter.post("/daily-challenges/today/trivia", status_code=status.HTTP_200_OK)
async def submit_trivia(request: TriviaSubmitRequest, current_user: user_dependency):
    today = date_type.today()
    challenge = daily_utils.get_challenge_for_date(today)
    if not challenge or challenge.type != "trivia":
        raise HTTPException(status_code=400, detail="No trivia challenge today")

    user_id = auth_utils.get_user_id(current_user.username)
    if daily_utils.get_existing_attempt(user_id, challenge.id):
        raise HTTPException(status_code=409, detail="Already attempted today's trivia")

    try:
        return daily_utils.submit_trivia(user_id, challenge.id, today, request.answers)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@DailyRouter.post("/daily-challenges/today/silhouette/guess", status_code=status.HTTP_200_OK)
async def guess_silhouette(request: SilhouetteGuessRequest, current_user: user_dependency):
    today = date_type.today()
    challenge = daily_utils.get_challenge_for_date(today)
    if not challenge or challenge.type != "silhouette":
        raise HTTPException(status_code=400, detail="No silhouette challenge today")

    user_id = auth_utils.get_user_id(current_user.username)

    try:
        return daily_utils.submit_silhouette_guess(user_id, challenge.id, today, request.guess)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@DailyRouter.post("/admin/daily-challenges", response_model=DailyChallenge, status_code=status.HTTP_201_CREATED)
async def create_daily_challenge(request: CreateDailyChallengeRequest, current_user: user_dependency):
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")
    if request.type not in ("trivia", "silhouette"):
        raise HTTPException(status_code=400, detail="type must be 'trivia' or 'silhouette'")

    return daily_utils.create_challenge(request.challenge_date, request.type, request.content, request.answer)


@DailyRouter.get("/streaks/me", response_model=Streak)
async def get_my_streak(current_user: user_dependency):
    return daily_utils.get_streak(auth_utils.get_user_id(current_user.username))