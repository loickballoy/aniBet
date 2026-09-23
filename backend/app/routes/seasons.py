from fastapi import APIRouter, HTTPException, status

from app.models.season import Season, CreateSeasonRequest, SeasonSnapshot, HallOfFameEntry
from app.utils import auth_utils
from app.utils import season_utils

user_dependency = auth_utils.user_dependency

SeasonRouter = APIRouter(tags=["seasons"])


@SeasonRouter.post("/admin/seasons", response_model=Season, status_code=status.HTTP_201_CREATED)
async def create_season(request: CreateSeasonRequest, current_user: user_dependency):
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")

    existing = season_utils.get_active_season()
    if existing:
        raise HTTPException(status_code=400, detail="A season is already active — end it before starting a new one")

    return season_utils.create_season(request.starts_at, request.ends_at)


@SeasonRouter.post("/admin/seasons/{season_id}/end", status_code=status.HTTP_200_OK)
async def end_season(season_id: int, current_user: user_dependency):
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")

    try:
        season_utils.end_season(season_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "Season ended, leaderboard frozen"}


@SeasonRouter.get("/seasons/active", response_model=Season | None)
async def get_active_season():
    return season_utils.get_active_season()


@SeasonRouter.get("/seasons/hall-of-fame", response_model=list[HallOfFameEntry])
async def get_hall_of_fame():
    return season_utils.get_hall_of_fame()


@SeasonRouter.get("/seasons/{season_id}/leaderboard", response_model=list[SeasonSnapshot])
async def get_season_leaderboard(season_id: int, limit: int = 20, offset: int = 0):
    return season_utils.get_season_leaderboard(season_id, limit, offset)