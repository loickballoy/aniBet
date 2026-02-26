from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta

from app.db import get_supabase
from app.models.user import UserInDB
from app.setting import settings
from fastapi import APIRouter, Depends, HTTPException
from datetime import timedelta, datetime, UTC
from typing import Annotated

from starlette import status
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from authlib.integrations.starlette_client import OAuth
import os
from jose import jwt, JWTError
from starlette.config import Config

from app.validators.validators import GoogleUser
from app.models.user import User
from app.db import db_dependency

ALGORITHM = "HS256"

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth_bearer = OAuth2PasswordBearer(tokenUrl="auth/token")

GOOGLE_CLIENT_ID = settings.google_client_id or None
GOOGLE_CLIENT_SECRET = settings.google_client_secret or None

if GOOGLE_CLIENT_ID is None or GOOGLE_CLIENT_SECRET is None:
    raise Exception('Missing env variables')

config_data = {'GOOGLE_CLIENT_ID': GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_SECRET': GOOGLE_CLIENT_SECRET}

starlette_config = Config(environ=config_data)

oauth = OAuth(starlette_config)

oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)


def get_user_by_email(email: str) -> UserInDB:
    """
    Util Function used to retrieve a user from out supabase db
    """
    supabase = next(get_supabase())
    response = supabase.table('User').select('*').eq("email", email).execute()
    return UserInDB(**response.data[0]) if response.data else None

def get_user_by_username(username: str) -> UserInDB:
    """
    Util Function used to retrieve a user from out supabase db
    """
    supabase = next(get_supabase())
    response = supabase.table('User').select('*').eq("username", username).execute()
    return UserInDB(**response.data[0]) if response.data else None

def get_user_by_google_sub(sub: str) -> UserInDB:
    """
    Util Function used to retrieve a user from out supabase db
    """
    supabase = next(get_supabase())
    response = supabase.table('User').select('*').eq("google_sub", sub).execute()
    return UserInDB(**response.data[0]) if response.data else None

def get_user_by_id(user_id: int) -> UserInDB:
    """
    Util Function used to retrieve a user from out supabase db
    """
    supabase = next(get_supabase())
    response = supabase.table('User').select('*').eq("id", user_id).execute()
    return UserInDB(**response.data[0]) if response.data else None

def get_user_id(username: str) -> int:
    """
    Util Function used to retrieve a user from out supabase db
    """
    supabase = next(get_supabase())
    response = supabase.table('User').select('id').eq("username", username).execute()
    return response.data[0]['id'] if response.data else None

def get_password_hash(password):
    return bcrypt_context.hash(password)

def authenticate_user(username: str, password: str) -> User | bool:
    user: User = get_user_by_username(username)

    if not user:
        return False

    if not bcrypt_context.verify(password, user.password_hash):
        return False
    return user


def create_access_token(username: str, user_id: int, expires_delta: timedelta):
    encode = {"sub": username, "id": user_id}

    expires = datetime.now(UTC) + expires_delta

    encode.update({"exp": expires})

    return jwt.encode(encode, settings.secret_key, algorithm=ALGORITHM)


def create_refresh_token(username: str, user_id: int, expires_delta: timedelta):
    return create_access_token(username, user_id, expires_delta)


def decode_token(token):
    return jwt.decode(token, settings.secret_key, algorithms=ALGORITHM)


def get_current_user(token: Annotated[str, Depends(oauth_bearer)], db: db_dependency):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=ALGORITHM)
        googe_sub: str = payload.get("sub")
        user_id: int = payload.get("id")

        user: User = get_user_by_google_sub(googe_sub)
        if user is None:
            user = get_user_by_id(user_id)

        if googe_sub is None or user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
        return user
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")


def token_expired(token: Annotated[str, Depends(oauth_bearer)]):
    try:
        payload = decode_token(token)
        if not datetime.fromtimestamp(payload.get('exp'), UTC) > datetime.now(UTC):
            return True
        return False

    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")



def create_user_from_google_info(google_user: GoogleUser):
    supabase = next(get_supabase())
    google_sub = google_user.sub
    email = google_user.email

    existing_user = get_user_by_google_sub(google_sub)

    if existing_user:
        existing_user.google_sub = google_sub
        response = supabase.table('User').update({"google_sub": google_sub}).eq("email", email).execute()
        response = supabase.table('User').update({"updated_at": datetime.now(UTC)}).eq("email", email).execute()
        return existing_user
    else:
        new_user = User(
            username=email,
            google_sub=str(google_sub),
            email=email,
            role="user",
        )
        response = supabase.table('User').insert(new_user.model_dump()).execute()
        return new_user

def change_username(new_username, old_username):
    supabase = next(get_supabase())
    supabase.table("User").update({"username": new_username}).eq("username", old_username).execute()    

def update_avatar(avatar_url, email):
    supabase = next(get_supabase())
    supabase.table("User").update({"pfp_url": avatar_url}).eq("email", email).execute()

user_dependency = Annotated[dict, Depends(get_current_user)]