from fastapi import APIRouter, HTTPException, Query, status

from app.utils import auth_utils
from app.utils import growth_utils
from app.utils import rank_utils

user_dependency = auth_utils.user_dependency

GrowthRouter = APIRouter(tags=["growth"])


# ---------------------------------------------------------------------------
# Quête de démarrage
# ---------------------------------------------------------------------------

@GrowthRouter.get("/quests/starter")
async def get_starter_quests(current_user: user_dependency):
    return growth_utils.get_starter_quests(auth_utils.get_user_id(current_user.username))


@GrowthRouter.post("/quests/starter/{quest_key}/claim", status_code=status.HTTP_200_OK)
async def claim_starter_quest(quest_key: str, current_user: user_dependency):
    try:
        balance = growth_utils.claim_quest(auth_utils.get_user_id(current_user.username), quest_key)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"new_balance": balance}


# ---------------------------------------------------------------------------
# Créateurs
# ---------------------------------------------------------------------------

@GrowthRouter.get("/rank/creators")
async def get_top_creators(limit: int = Query(20, ge=1, le=100)):
    return growth_utils.get_top_creators(limit)


# ---------------------------------------------------------------------------
# Follows
# ---------------------------------------------------------------------------

def _target_id(username: str, current_user) -> int:
    target = auth_utils.get_user_by_username(username)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.username == current_user.username:
        raise HTTPException(status_code=400, detail="You can't follow yourself")
    return auth_utils.get_user_id(target.username)


@GrowthRouter.post("/users/{username}/follow", status_code=status.HTTP_200_OK)
async def follow_user(username: str, current_user: user_dependency):
    growth_utils.follow(auth_utils.get_user_id(current_user.username), _target_id(username, current_user))
    return {"following": True}


@GrowthRouter.delete("/users/{username}/follow", status_code=status.HTTP_200_OK)
async def unfollow_user(username: str, current_user: user_dependency):
    growth_utils.unfollow(auth_utils.get_user_id(current_user.username), _target_id(username, current_user))
    return {"following": False}


@GrowthRouter.get("/users/me/following")
async def my_following(current_user: user_dependency):
    return growth_utils.get_following_usernames(auth_utils.get_user_id(current_user.username))


@GrowthRouter.get("/rank/leaderboard/following")
async def following_leaderboard(current_user: user_dependency):
    return growth_utils.get_following_leaderboard(
        auth_utils.get_user_id(current_user.username), rank_utils._get_active_season_window(),
    )


# ---------------------------------------------------------------------------
# Métriques
# ---------------------------------------------------------------------------

@GrowthRouter.get("/admin/metrics")
async def growth_metrics(current_user: user_dependency):
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")
    return growth_utils.get_growth_metrics()
