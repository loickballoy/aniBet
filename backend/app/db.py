from app.setting import settings
from supabase import create_client, Client
from fastapi import Depends

supabase : Client = create_client(settings.database_url, settings.database_key)

from typing import Generator, Annotated

def get_supabase():
    yield supabase

db_dependency = Annotated[Client, Depends(get_supabase)]