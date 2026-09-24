"""
Upload d'images vers Cloudflare R2. Le backend ne voit jamais les octets du
fichier — il génère juste une URL présignée que le frontend utilise pour
uploader DIRECTEMENT vers R2, sans faire transiter l'image par notre serveur.
"""

import uuid

import boto3
from botocore.client import Config

from app.setting import settings

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

PRESIGN_EXPIRY_SECONDS = 300  # 5 minutes pour compléter l'upload


def _get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def generate_presigned_upload(kind: str, content_type: str) -> dict:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"Unsupported content type: {content_type}")

    ext = ALLOWED_CONTENT_TYPES[content_type]
    key = f"{kind}/{uuid.uuid4()}.{ext}"

    client = _get_r2_client()
    upload_url = client.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.r2_bucket_name, "Key": key, "ContentType": content_type},
        ExpiresIn=PRESIGN_EXPIRY_SECONDS,
    )

    public_url = f"{settings.r2_public_url_base.rstrip('/')}/{key}"

    return {"upload_url": upload_url, "public_url": public_url, "key": key}