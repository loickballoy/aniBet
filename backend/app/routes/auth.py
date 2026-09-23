from datetime import timedelta

from authlib.integrations.base_client import OAuthError
from authlib.oauth2.rfc6749 import OAuth2Token

from typing import Any, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm

from app.models.user import User, UserInDB
from app.setting import settings
from app.utils import auth_utils
from app.utils import db_utils
from app.validators.validators import (
    DiscordUser, GoogleUser, Token, RefreshTokenRequest,
    ChangeUsernameRequest, ChangeAvatarRequest,
)

AuthRouter = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

GOOGLE_REDIRECT_URI = settings.google_redirect_uri
DISCORD_REDIRECT_URI = settings.discord_redirect_uri
FRONTEND_URL = settings.frontend_url

@AuthRouter.get('/google', tags=["auth"])
async def login_google(request: Request):
    """
    Redirects the user to google's OAuth 2.0 server for authentication.
    """
    return await auth_utils.oauth.google.authorize_redirect(request, GOOGLE_REDIRECT_URI, prompt='select_account')

@AuthRouter.get("/callback/google")
async def auth_google(request: Request):

    try: 
        user_response: OAuth2Token = await auth_utils.oauth.google.authorize_access_token(request)
    except:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    user_info = user_response.get("userinfo")
    google_user = GoogleUser(**user_info)

    existing_user = auth_utils.get_user_by_google_sub(google_user.sub)
    user = existing_user if existing_user else auth_utils.create_user_from_google_info(google_user)

    return _issue_tokens_and_redirect(user)

@AuthRouter.get("/discord", tags=["auth"])
async def login_discord(request: Request):
    return await auth_utils.oauth.discord.authorize_redirect(request, DISCORD_REDIRECT_URI)

@AuthRouter.get("/callback/discord")
async def auth_discord(request: Request):
    try:
        token = await auth_utils.oauth.discord.authorize_access_token(request)
    except OAuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    resp = await auth_utils.oauth.discord.get('users/@me', token=token)
    resp.raise_for_status()
    discord_user = DiscordUser(**resp.json())

    existing_user = auth_utils.get_user_by_discord_id(discord_user.id)
    user = existing_user if existing_user else auth_utils.create_user_from_discord_info(discord_user)

    return _issue_tokens_and_redirect(user)

def _issue_tokens_and_redirect(user) -> RedirectResponse:
    user_id = auth_utils.get_user_id(user.username)
    access_token = auth_utils.create_refresh_token(user.username,  user_id, timedelta(days=7))
    refresh_token = auth_utils.create_refresh_token(user.username,user_id, timedelta(days=14))
    return RedirectResponse(f"{FRONTEND_URL}/auth?access_token={access_token}&refresh_token={refresh_token}")

@AuthRouter.post('/signup', tags=["auth"])
async def signup(user: UserInDB) -> dict[str, Any]:
    if not user.password_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is required")

    existing_user = auth_utils.get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user.password_hash = auth_utils.get_password_hash(user.password_hash)
    db_utils.db_insert(user)

    return {"message": "User created successfully"}

@AuthRouter.get("/get-user", status_code=status.HTTP_201_CREATED)
async def get_user(user: auth_utils.user_dependency):
    return user

@AuthRouter.post("/token", response_model=Token, status_code=status.HTTP_200_OK)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = auth_utils.authenticate_user(form_data.username, form_data.password)

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user")

    user_id = auth_utils.get_user_id(user.username)
    access_token = auth_utils.create_access_token(user.username, user_id, timedelta(days=7))
    refresh_token = auth_utils.create_refresh_token(user.username, user_id, timedelta(days=14))

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@AuthRouter.post("/refresh", response_model=Token)
async def refresh_acess_token(refresh_token_request: RefreshTokenRequest):
    token= refresh_token_request.refresh_token

    if auth_utils.token_expired(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is expired")

    payload = auth_utils.decode_token(token)
    access_token = auth_utils.create_access_token(payload["sub"], payload["id"], timedelta(days=7))
    new_refresh_token = auth_utils.create_access_token(payload["sub"], payload["id"], timedelta(days=14))

    return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}

@AuthRouter.patch("/change-username")
async def change_username(request: ChangeUsernameRequest, current_user: auth_utils.user_dependency):
    new_username = request.new_username.strip()

    if len(new_username) < 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username trop court (Min 3 caractères)")
    if len(new_username) > 24:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username trop long (Max 24 caractères)")

    import re
    if not re.match(r'^[a-zA-Z0-9_\-\.]+$', new_username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Caractères invalides")

    existing = auth_utils.get_user_by_username(request.new_username)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username Already taken")

    auth_utils.change_username(request.new_username, current_user.username)

    return {"message": "Username updated successfully"}

@AuthRouter.patch("/change-avatar")
async def change_avatar(
    request: ChangeAvatarRequest,
    current_user: auth_utils.user_dependency
):
    auth_utils.update_avatar(request.pfp_url, current_user.email)

    return {"message": "Avatar mis à jour", "pfp_url": request.pfp_url}