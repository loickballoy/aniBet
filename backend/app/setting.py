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

FRONTEND_URL = os.getenv("FRONTEND_URL")

SECRET_KEY = os.getenv("SECRET_KEY")

class Settings:
    database_url: str = DATABASE_URL
    database_key: str = DATABASE_KEY

    google_client_id: str = GOOGLE_CLIENT_ID
    google_client_secret: str = GOOGLE_CLIENT_SECRET
    google_redirect_uri: str = GOOGLE_REDIRECT_URI
    
    frontend_url: str = FRONTEND_URL

    secret_key: str = SECRET_KEY

settings = Settings()