from app.utils.auth_utils import user_dependency

from app.db import get_supabase
from app.models.user import UserInLeaderboard

from app.setting import TIERS

def get_leaderboard(limit, offset):
    supabase = next(get_supabase())
    res = supabase.table("User").select("username, points_balance").neq("role", "admin").order("points_balance", desc=True).range(offset,offset + limit - 1).execute()
    leaderboard = [UserInLeaderboard(**row) for row in res.data]
    for index in range(len(leaderboard)):
        player = leaderboard[index]
        player.rank = (offset + index + 1)
        player.tier = get_tier(player.points_balance)
    return leaderboard

def get_user_rank(current_user: user_dependency):
    supabase = next(get_supabase())
    res = supabase.table("User").select("id", count="exact").gt("points_balance", current_user.points_balance).execute()
    return res.count+1

def get_tier(points_balance: int):
    for tier in reversed(TIERS):
        if points_balance >= tier["min"]:
            return tier["name"]
    return "Iron"