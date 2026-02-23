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
from app.utils import auth_utils, db_utils
from app.db import db_dependency
from app.validators import *
from app.validators.validators import GoogleUser, Token, RefreshTokenRequest

AuthRouter = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

GOOGLE_CLIENT_ID = settings.google_client_id
GOOGLE_CLIENT_SECRET = settings.google_client_secret
GOOGLE_REDIRECT_URI = settings.google_redirect_uri
FRONTEND_URL = settings.frontend_url

@AuthRouter.get('/google', tags=["auth"])
async def login_google(request: Request):
    """
    Redirects the user to Google's OAuth 2.0 server for authentication.
    """
    return await auth_utils.oauth.google.authorize_redirect(request, GOOGLE_REDIRECT_URI, prompt='select_account') 

@AuthRouter.get("/callback/google")
async def auth_google(request: Request, db: db_dependency):
    try:
        user_response: OAuth2Token = await auth_utils.oauth.google.authorize_access_token(request)
    except OAuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    user_info = user_response.get("userinfo")

    print(user_info)

    google_user = GoogleUser(**user_info)

    existing_user = auth_utils.get_user_by_google_sub(google_user.sub)

    if existing_user:
        print("Existing user")
        user = existing_user
    else:
        print("Creating user")
        user = auth_utils.create_user_from_google_info(google_user)

    access_token = auth_utils.create_access_token(user.username, auth_utils.get_user_id(user.username), timedelta(days=7))
    refresh_token = auth_utils.create_refresh_token(user.username, auth_utils.get_user_id(user.username), timedelta(days=14))

    return RedirectResponse(f"{FRONTEND_URL}/auth?access_token={access_token}&refresh_token={refresh_token}")


@AuthRouter.post('/signup', tags=["auth"])
async def signup(user: UserInDB) -> dict[str, Any]:
    """

    """

    try:
        # Check If user exists
        existing_user = auth_utils.get_user_by_email(user.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        # Hash Password
        user.password_hash = auth_utils.get_password_hash(user.password_hash)
        # Add to supabase db
        db_utils.db_insert(user)
        
        
        """# Create JWT token
        created_user = get_user(user.email)
        payload = json.loads(created_user.model_dump_json())
        token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        add_verification_token(created_user, token)"""

        
        return {"message": "User created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@AuthRouter.get("/get-user", status_code=status.HTTP_201_CREATED)
async def get_user(user: auth_utils.user_dependency):
    return user


@AuthRouter.post("/token", response_model=Token, status_code=status.HTTP_200_OK)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = auth_utils.authenticate_user(form_data.username, form_data.password)

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")

    user_id = auth_utils.get_user_id(user.username)
    access_token = auth_utils.create_access_token(user.username, user_id, timedelta(days=7))
    refresh_token = auth_utils.create_refresh_token(user.username, user_id, timedelta(days=14))

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@AuthRouter.post("/refresh", response_model=Token)
async def refresh_access_token(refresh_token_request: RefreshTokenRequest):
    token = refresh_token_request.refresh_token

    if auth_utils.token_expired(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is expired.")

    payload = auth_utils.decode_token(token)
    access_token = auth_utils.create_access_token(payload["sub"], payload["id"], timedelta(days=7))
    new_refresh_token = auth_utils.create_refresh_token(payload["sub"], payload["id"], timedelta(days=14))

    return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}
