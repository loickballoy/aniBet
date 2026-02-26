from pydantic import BaseModel


class CreateUserRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class GoogleUser(BaseModel):
    sub: int
    email: str
    name: str
    picture: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangeUsernameRequest(BaseModel):
    new_username: str

class ChangeAvatarRequest(BaseModel):
    pfp_url: str