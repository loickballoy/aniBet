
from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta

from app.db import get_supabase
from app.models.user import User
from app.setting import settings

def db_insert(user: User) -> None:
    supabase = next(get_supabase())
    supabase.table('User').insert(user.model_dump()).execute()