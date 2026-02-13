from dotenv import load_dotenv
import os
from pathlib import Path

load_dotenv()

# Load environment variables from .env file
DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_KEY = os.getenv("DATABASE_KEY")

class Settings:
    database_url: str = DATABASE_URL
    database_key: str = DATABASE_KEY

settings = Settings()