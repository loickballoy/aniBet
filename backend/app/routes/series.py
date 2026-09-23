from fastapi import APIRouter, HTTPException, status

from app.models.series import Series, CreateSeriesRequest, UpdateSeriesRequest
from app.utils import auth_utils
from app.utils import series_utils

user_dependency = auth_utils.user_dependency

SeriesRouter = APIRouter(
    prefix="/series",
    tags=["series"]
)

@SeriesRouter.get("/", response_model=list[Series])
async def list_series():
    return series_utils.get_all_series()

@SeriesRouter.get("/{series_id}", response_model=Series)
async def get_series(series_id):
    series = series_utils.get_series_by_id(series_id)
    if not series:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Series not found")
    return series

@SeriesRouter.post("/", response_model=Series, status_code=status.HTTP_201_CREATED)
async def create_series(request: CreateSeriesRequest, current_user: user_dependency):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    existing = series_utils.get_series_by_slug(request.slug)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists")
    return series_utils.create_series(request.name, request.slug, request.cover_url)

@SeriesRouter.delete("/{series_id}", status_code=status.HTTP_200_OK)
async def delete_series(series_id: int, current_user: user_dependency):
    if current_user.role !="admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    series = series_utils.get_series_by_id(series_id)
    if not series:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")
    series_utils.delete_series(series_id)
    return {"message": "Series deleted"}

@SeriesRouter.patch("/{series_id}", response_model=Series)
async def update_series(series_id: int, request: UpdateSeriesRequest, current_user: user_dependency):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    series = series_utils.get_series_by_id(series_id)
    if not series:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")
    data = {k: v for k, v in request.model_dump().items() if v is not None}
    if not data:
        return series
    series_utils.update_series(data, series_id)

    return series_utils.get_series_by_id(series_id)
       