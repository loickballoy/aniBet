from fastapi import APIRouter, Depends, HTTPException, status

from app.models.user import UserInLeaderboard
from app.utils.auth_utils import user_dependency
from app.utils import bet_utils, auth_utils, rank_utils

from app.setting import TIERS


RankRouter = APIRouter(
    prefix="/rank", 
    tags=["rank"]
)

@RankRouter.get("/leaderboard", response_model=list[UserInLeaderboard])
async def get_leaderboard(limit: int = 20, offset: int = 0) -> list[UserInLeaderboard]:
    return rank_utils.get_leaderboard(limit=limit, offset=offset)

@RankRouter.get("/leaderboard/me")
async def get_my_rank(current_user: user_dependency):
    user_rank = rank_utils.get_user_rank(current_user)
    return user_rank

@RankRouter.get("leaderboard/tiers")
async def get_tiers():
    return TIERS