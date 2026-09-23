from datetime import datetime, timedelta, UTC
from typing import Annotated

from authlib.integrations.starlette_client import OAuth
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from starlette.config import Config

from app.db import pool
from app.models.user import User, UserInDB
from app.setting import settings
from app.validators.validators import GoogleUser, DiscordUser

ALGORITHM = "HS256"

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth_bearer = OAuth2PasswordBearer(tokenUrl="auth/token")

# Oauth Google

GOOGLE_CLIENT_ID = settings.google_client_id or None
GOOGLE_CLIENT_SECRET = settings.google_client_secret or None
DISCORD_CLIENT_ID = settings.discord_client_id or None
DISCORD_CLIENT_SECRET = settings.discord_client_secret or None

if GOOGLE_CLIENT_ID is None or GOOGLE_CLIENT_SECRET is None:
    raise Exception('Missing Google OAuth env variables')

if DISCORD_CLIENT_ID is None or DISCORD_CLIENT_SECRET is None:
    raise Exception('Missing Discord OAuth env variables')

config_data = {
    'GOOGLE_CLIENT_ID': GOOGLE_CLIENT_ID, 
    'GOOGLE_CLIENT_SECRET': GOOGLE_CLIENT_SECRET,
    'DISCORD_CLIENT_ID': DISCORD_CLIENT_ID,
    'DISCORD_CLIENT_SECRET': DISCORD_CLIENT_SECRET
}

starlette_config = Config(environ=config_data)
oauth = OAuth(starlette_config)

oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

oauth.register(
    name='discord',
    access_token_url='https://discord.com/api/oauth2/token',
    authorize_url="https://discord.com/api/oauth2/authorize",
    api_base_url='https://discord.com/api/',
    client_kwargs={'scope': 'identify email'}
)

#
# Lookups user
#

def get_user_by_email(email: str) -> UserInDB | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM "User" WHERE email = %s', (email,))
            row = cur.fetchone()
    return UserInDB(**row) if row else None

def get_user_by_username(username: str) -> UserInDB | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM "User" WHERE username = %s', (username,))
            row = cur.fetchone()
    return UserInDB(**row) if row else None

def get_user_by_google_sub(sub: str) -> UserInDB | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM "User" WHERE google_sub = %s', (sub,))
            row = cur.fetchone()
    return UserInDB(**row) if row else None

def get_user_by_discord_id(discord_id: str) -> UserInDB | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM "User" WHERE discord_id = %s', (discord_id,))
            row = cur.fetchone()
    return UserInDB(**row) if row else None

def get_user_by_id(user_id: int) -> UserInDB | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM "User" WHERE id = %s', (user_id,))
            row = cur.fetchone()
    return UserInDB(**row) if row else None

def get_user_id(username: str) -> int | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT id FROM "User" WHERE username = %s', (username,))
            row = cur.fetchone()
    return row["id"] if row else None

#
# Mot de passe
#

def get_password_hash(password):
    return bcrypt_context.hash(password)

def authenticate_user(username: str, password: str) -> User | bool:
    user = get_user_by_username(username)

    if not user:
        return False
    if not user.password_hash:
        return False
    if not bcrypt_context.verify(password, user.password_hash):
        return False

    return user

#
# JWT
#

def create_access_token(username: str, user_id: int, expires_delta: timedelta):
    encode = {"sub": username, "id": user_id}

    expires = datetime.now(UTC) + expires_delta

    encode.update({"exp": expires})

    return jwt.encode(encode, settings.secret_key, algorithm=ALGORITHM)


def create_refresh_token(username: str, user_id: int, expires_delta: timedelta):
    return create_access_token(username, user_id, expires_delta)


def decode_token(token):
    return jwt.decode(token, settings.secret_key, algorithms=ALGORITHM)


def get_current_user(token: Annotated[str, Depends(oauth_bearer)]):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=ALGORITHM)
        user_id: int | None = payload.get("id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
        user = get_user_by_id(user_id)
        if user is None:
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

#
# Creation / update de compte
#

def create_user_from_google_info(google_user: GoogleUser):
    google_sub = google_user.sub
    email = google_user.email

    existing_user = get_user_by_google_sub(google_sub)

    if existing_user:
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute('UPDATE "User" SET google_sub = %s, updated_at = now() WHERE email = %s', (google_sub, email),)
            conn.commit()
        existing_user.google_sub = google_sub
        return existing_user

    new_user = User(
        username=email,
        google_sub=str(google_sub),
        email=email,
        role="user"
    )

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "User" (username, google_sub, email, role, is_banned, points_balance)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (new_user.username, new_user.google_sub, new_user.email, 
                 new_user.role, new_user.is_banned, new_user.points_balance),
            )
        conn.commit()
    return new_user

def create_user_from_discord_info(discord_user: DiscordUser) -> User:
    existing_by_id = get_user_by_discord_id(discord_user.id)
    if existing_by_id:
        return existing_by_id

    if not discord_user.email or not discord_user.verified:
        email = f"discord_{discord_user.id}@no-email.anibet.local"
        new_user = User(
            username=discord_user.username,
            discord_id=discord_user.id,
            email=email,
            role="user",
        )
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO "User" (username, discord_id, email, role, is_banned, points_balance)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (new_user.username, new_user.discord_id, new_user.email, 
                     new_user.role, new_user.is_banned, new_user.points_balance),
                )
            conn.commit()
        return new_user

    existing_by_email = get_user_by_email(discord_user.email)
    if existing_by_email:
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'UPDATE "User" SET discord_id = %s, updated_at = now() WHERE email = %s',
                    (discord_user.id, discord_user.email)
                )
            conn.commit()
        existing_by_email.discord_id = discord_user.id
        return existing_by_email

    new_user = User(
        username=discord_user.username,
        discord_id=discord_user.id,
        email=discord_user.email,
        role="user"
    )
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "User" (username, discord_id, email, role, is_banned, points_balance)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (new_user.username, new_user.discord_id, new_user.email,
                 new_user.role, new_user.is_banned, new_user.points_balance)
            )
        conn.commit()
    return new_user

def change_username(new_username: str, old_username: str) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'UPDATE "User" SET username = %s WHERE username = %s',
                (new_username, old_username)
            )
        conn.commit()

def update_avatar(avatar_url, email: str) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'UPDATE "User" SET pfp_url = %s WHERE email = %s',
                (avatar_url, email) 
            )
        conn.commit()

user_dependency = Annotated[dict, Depends(get_current_user)]