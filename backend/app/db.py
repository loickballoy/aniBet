from app.setting import settings
from supabase import create_client, Client

supabase : Client = create_client(settings.database_url, settings.database_key)

from typing import Generator

def get_supabase():
    yield supabase
