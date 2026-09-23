from fastapi import APIRouter, HTTPException, status

from app.models.weekly import WeeklyConnections, CreateWeeklyConnectionsRequest, WeeklyGuessRequest
from app.utils import auth_utils
from app.utils import weekly_utils

user_dependency = auth_utils.user_dependency

WeeklyRouter = APIRouter(tags=["weekly"])


@WeeklyRouter.get("/weekly-connections/current")
async def get_current_puzzle(current_user: user_dependency):
    week_of = weekly_utils.get_current_week_start()
    puzzle = weekly_utils.get_puzzle_for_week(week_of)
    if not puzzle:
        raise HTTPException(status_code=404, detail="No AniConnections puzzle scheduled for this week")

    user_id = auth_utils.get_user_id(current_user.username)
    attempt = weekly_utils.get_existing_attempt(user_id, puzzle.id)

    return {"puzzle": puzzle, "attempt": attempt}


@WeeklyRouter.post("/weekly-connections/current/guess", status_code=status.HTTP_200_OK)
async def submit_guess(request: WeeklyGuessRequest, current_user: user_dependency):
    week_of = weekly_utils.get_current_week_start()
    puzzle = weekly_utils.get_puzzle_for_week(week_of)
    if not puzzle:
        raise HTTPException(status_code=404, detail="No AniConnections puzzle scheduled for this week")

    user_id = auth_utils.get_user_id(current_user.username)

    try:
        return weekly_utils.submit_guess(user_id, puzzle.id, week_of, request.character_ids)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@WeeklyRouter.post("/admin/weekly-connections", response_model=WeeklyConnections, status_code=status.HTTP_201_CREATED)
async def create_weekly_puzzle(request: CreateWeeklyConnectionsRequest, current_user: user_dependency):
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")
    if len(request.grid) != 16:
        raise HTTPException(status_code=400, detail="Grid must contain exactly 16 characters")
    if len(request.categories) != 4:
        raise HTTPException(status_code=400, detail="There must be exactly 4 categories")

    return weekly_utils.create_puzzle(request.week_of, request.grid, request.categories)