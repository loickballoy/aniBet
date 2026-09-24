from dotenv import load_dotenv
import os
from pathlib import Path

TIERS = [
        {"name": "Iron",    "min": 0,      "max": 9999},
        {"name": "Bronze",  "min": 1000,   "max": 19999},
        {"name": "Silver",  "min": 20000,  "max": 39999},
        {"name": "Gold",    "min": 40000,  "max": 99999},
        {"name": "Diamond", "min": 100000, "max": None},
    ]


load_dotenv()

# Load environment variables from .env file
DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_KEY = os.getenv("DATABASE_KEY")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI =os.getenv("DISCORD_REDIRECT_URI")

FRONTEND_URL = os.getenv("FRONTEND_URL")

R2_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("CLOUDFLARE_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("CLOUDFLARE_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("CLOUDFLARE_BUCKET_NAME")
R2_PUBLIC_URL_BASE = os.getenv("CLOUDFLARE_PUBLIC_URI")

SECRET_KEY = os.getenv("SECRET_KEY")

SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY")

class Settings:
    database_url: str = DATABASE_URL
    database_key: str = DATABASE_KEY

    google_client_id: str = GOOGLE_CLIENT_ID
    google_client_secret: str = GOOGLE_CLIENT_SECRET
    google_redirect_uri: str = GOOGLE_REDIRECT_URI
    
    discord_client_id: str = DISCORD_CLIENT_ID
    discord_client_secret: str = DISCORD_CLIENT_SECRET
    discord_redirect_uri: str = DISCORD_REDIRECT_URI

    frontend_url: str = FRONTEND_URL

    r2_account_id: str = R2_ACCOUNT_ID
    r2_access_key_id: str = R2_ACCESS_KEY_ID
    r2_secret_access_key: str = R2_SECRET_ACCESS_KEY
    r2_bucket_name: str = R2_BUCKET_NAME
    r2_public_url_base: str = R2_PUBLIC_URL_BASE

    secret_key: str = SECRET_KEY
    session_secret_key: str = SESSION_SECRET_KEY

settings = Settings()