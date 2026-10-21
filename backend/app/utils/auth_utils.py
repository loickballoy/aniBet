from datetime import datetime, timedelta, UTC
from typing import Annotated

from authlib.integrations.starlette_client import OAuth
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import bcrypt
from starlette.config import Config

from app.db import pool
from app.models.user import User, UserInDB
from app.setting import settings
from app.validators.validators import GoogleUser, DiscordUser

ALGORITHM = "HS256"


oauth_bearer = OAuth2PasswordBearer(tokenUrl="auth/token")
# Variante qui ne renvoie pas 401 sans token : pour les routes jouables en invité.
oauth_bearer_optional = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)

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

def search_users_by_username(query: str, limit: int = 10) -> list[dict]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT id, username, role FROM "User" WHERE username ILIKE %s ORDER BY username LIMIT %s',
                (f"%{query}%", limit),
            )
            return cur.fetchall()

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

def _password_bytes(password: str) -> bytes:
    # bcrypt ne prend en compte que les 72 premiers octets. passlib tronquait
    # déjà silencieusement : on garde exactement le même comportement pour que
    # les mots de passe hashés avant la migration restent valides.
    return password.encode("utf-8")[:72]


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:  # comptes OAuth : pas de mot de passe
        return False
    try:
        return bcrypt.checkpw(_password_bytes(password), password_hash.encode("utf-8"))
    except ValueError:  # hash malformé
        return False

def authenticate_user(username: str, password: str) -> User | bool:
    user = get_user_by_username(username)

    if not user or user.is_banned:
        return False
    if not user.password_hash:
        return False
    if not verify_password(password, user.password_hash):
        return False

    return user

#
# JWT
#

ACCESS_TOKEN_TTL = timedelta(days=7)
REFRESH_TOKEN_TTL = timedelta(days=14)


def _encode_token(username: str, user_id: int, token_type: str, ttl: timedelta) -> str:
    # Le champ "type" empêche d'utiliser un refresh token comme access token
    # (et inversement) : avant, les deux étaient strictement identiques.
    payload = {"sub": username, "id": user_id, "type": token_type, "exp": datetime.now(UTC) + ttl}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_access_token(username: str, user_id: int, expires_delta: timedelta = ACCESS_TOKEN_TTL) -> str:
    return _encode_token(username, user_id, "access", expires_delta)


def create_refresh_token(username: str, user_id: int, expires_delta: timedelta = REFRESH_TOKEN_TTL) -> str:
    return _encode_token(username, user_id, "refresh", expires_delta)


def decode_token(token):
    return jwt.decode(token, settings.secret_key, algorithms=ALGORITHM)


def decode_refresh_token(token: str) -> dict:
    """Payload d'un refresh token valide, sinon 401 (expiré, falsifié, ou access token)."""
    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    if payload.get("type") != "refresh" or payload.get("id") is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    return payload


def get_current_user(token: Annotated[str, Depends(oauth_bearer)]):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=ALGORITHM)
        user_id: int | None = payload.get("id")
        if user_id is None or payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
        user = get_user_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
        if user.is_banned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is banned.")
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

def _take_over_by_verified_email(email: str, column: str, provider_id: str) -> UserInDB | None:
    """Rattache un compte OAuth à un compte existant de même email.

    L'inscription par mot de passe ne vérifie pas l'email : quelqu'un peut
    créer un compte avec l'adresse d'une victime AVANT qu'elle ne vienne via
    Google/Discord. Sans précaution, le rattachement lui donnerait accès au
    compte de la victime avec son propre mot de passe. Le fournisseur OAuth
    prouve que la victime possède l'adresse : c'est elle qui garde le compte,
    et le mot de passe (non vérifié) est invalidé.
    """
    if column not in ("google_sub", "discord_id"):  # interpolé dans le SQL ci-dessous
        raise ValueError(f"Unexpected OAuth column {column}")
    existing = get_user_by_email(email)
    if existing is None:
        return None
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f'UPDATE "User" SET {column} = %s, password_hash = NULL, updated_at = now() WHERE email = %s',
                (provider_id, email),
            )
        conn.commit()
    setattr(existing, column, provider_id)
    existing.password_hash = None
    return existing


def create_user_from_google_info(google_user: GoogleUser):
    existing_user = get_user_by_google_sub(google_user.sub)
    if existing_user:
        return existing_user

    email = google_user.email
    if get_user_by_email(email):
        if not google_user.email_verified:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already uses this email")
        return _take_over_by_verified_email(email, "google_sub", str(google_user.sub))

    new_user = User(
        username=email,
        google_sub=str(google_user.sub),
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

    existing_by_email = _take_over_by_verified_email(discord_user.email, "discord_id", discord_user.id)
    if existing_by_email:
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

def is_allowed_avatar_url(url: str) -> bool:
    """Seules les images passées par /uploads/presign (kind=avatar) : pas de
    pixel de tracking ni d'URL arbitraire affichée aux autres joueurs."""
    base = (settings.r2_public_url_base or "").rstrip("/")
    if base:
        return url.startswith(f"{base}/avatar/")
    return url.startswith("https://")  # dev sans R2 configuré


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


def get_optional_user(token: Annotated[str | None, Depends(oauth_bearer_optional)]):
    """Utilisateur connecté, ou None pour un invité. Un token absent, invalide
    ou expiré donne un invité plutôt qu'une erreur : on ne bloque jamais
    l'accès aux jeux."""
    if not token:
        return None
    try:
        return get_current_user(token)
    except HTTPException:
        return None


optional_user_dependency = Annotated[object | None, Depends(get_optional_user)]