from pydantic import BaseModel


class CreateUserRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class GoogleUser(BaseModel):
    sub: str  # opaque string per Google — pas garanti de tenir dans un int
    email: str
    name: str
    picture: str

class DiscordUser(BaseModel):
    id: str
    username: str
    email: str | None = None
    verified: bool = False
    avatar: str | None = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangeUsernameRequest(BaseModel):
    new_username: str

class ChangeAvatarRequest(BaseModel):
    pfp_url: str