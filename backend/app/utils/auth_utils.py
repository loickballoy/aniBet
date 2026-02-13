from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta

from app.db import get_supabase
from app.models.user import UserInDB
from app.setting import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user(email: str) -> UserInDB:
    """
    Util Function used to retrieve a user from out supabase db
    """
    supabase = next(get_supabase())
    response = supabase.table('User').select('*').eq("email", email).execute()
    return UserInDB(**response.data[0]) if response.data else None

def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)[:72]
