from pydantic import BaseModel

class User(BaseModel):
    username: str
    email: str
    role: str
    is_banned: bool = False
    points_balance: int = 10000
    

class UserInDB(User):
    password_hash: str