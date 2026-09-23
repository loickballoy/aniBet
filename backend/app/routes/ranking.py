from fastapi import APIRouter

from app.models.user import UserInLeaderboard
from app.utils import auth_utils
from app.utils import rank_utils
from app.setting import TIERS

user_dependency = auth_utils.user_dependency

RankRouter = APIRouter(
    prefix="/rank",
    tags=["rank"]
)

@RankRouter.get("/leaderboard", response_model=list[UserInLeaderboard])
async def get_leaderboard(limit: int = 20, offset: int = 0) -> list[UserInLeaderboard]:
    return rank_utils.get_leaderboard(limit=limit, offset=offset)

@RankRouter.get("/leaderboard/me")
async def get_my_rank(current_user: user_dependency):
    return rank_utils.get_user_rank(current_user)

@RankRouter.get("/leaderboard/tiers")
async def get_tiers():
    return TIERS