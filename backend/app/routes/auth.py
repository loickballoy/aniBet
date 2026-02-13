from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import User, UserInDB
from app.setting import settings
from app.utils import auth_utils, db_utils

AuthRouter = APIRouter()

@AuthRouter.post('/auth.signup', tags=["auth"])
async def signup(user: UserInDB) -> dict[str, Any]:
    """

    """

    try:
        # Check If user exists
        existing_user = auth_utils.get_user(user.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        # Hash Password
        user.password_hash = auth_utils.get_password_hash(user.password_hash)
        # Add to supabase db
        db_utils.db_insert(user)
        
        
        """# Create JWT token
        created_user = get_user(user.email)
        payload = json.loads(created_user.model_dump_json())
        token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        add_verification_token(created_user, token)"""

        
        return {"message": "User created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
