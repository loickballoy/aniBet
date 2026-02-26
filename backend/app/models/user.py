from pydantic import BaseModel

class User(BaseModel):
    username: str
    google_sub: str | None = None
    email: str
    role: str
    is_banned: bool = False
    points_balance: int = 10000
    pfp_url: str | None = None
    

class UserInDB(User):
    password_hash: str

class UserInLeaderboard(BaseModel):
    rank: int | None = None
    tier: str | None = None
    points_balance: int
    username: str 

