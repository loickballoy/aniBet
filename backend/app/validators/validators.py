from pydantic import AliasChoices, BaseModel, Field


class CreateUserRequest(BaseModel):
    username: str
    password: str


class SignupRequest(BaseModel):
    """Seuls champs qu'un visiteur peut choisir. Le rôle, le solde, le statut
    banni et les identifiants OAuth sont fixés par le serveur."""
    username: str = Field(min_length=3, max_length=24, pattern=r"^[a-zA-Z0-9_\-\.]+$")
    email: str = Field(max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    # "password_hash" : nom historique du champ envoyé par le frontend (en clair, hashé ici).
    password: str = Field(min_length=8, max_length=128, validation_alias=AliasChoices("password", "password_hash"))


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class GoogleUser(BaseModel):
    sub: str  # opaque string per Google — pas garanti de tenir dans un int
    email: str
    email_verified: bool = False
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
    pfp_url: str = Field(max_length=500)