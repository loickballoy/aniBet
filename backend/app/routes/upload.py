from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.utils import auth_utils
from app.utils import upload_utils

user_dependency = auth_utils.user_dependency

UploadsRouter = APIRouter(prefix="/uploads", tags=["uploads"])

# "avatar" : n'importe quel utilisateur connecté peut uploader le sien.
# Les autres kinds sont du contenu public (covers de séries/events/bingo),
# réservé aux admins — cohérent avec le reste de l'API.
ADMIN_ONLY_KINDS = {"series", "event", "bingo", "daily", "weekly"}
VALID_KINDS = {"avatar", "series", "event", "bingo", "daily", "weekly"}


class PresignRequest(BaseModel):
    kind: str
    content_type: str


@UploadsRouter.post("/presign")
async def presign_upload(request: PresignRequest, current_user: user_dependency):
    if request.kind not in VALID_KINDS:
        raise HTTPException(status_code=400, detail=f"Invalid kind, must be one of {VALID_KINDS}")
    if request.kind in ADMIN_ONLY_KINDS and current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")

    try:
        return upload_utils.generate_presigned_upload(request.kind, request.content_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))