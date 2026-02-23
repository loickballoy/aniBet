from fastapi import APIRouter, HTTPException, status
from app.models.series import Series, CreateSeriesRequest
from app.utils.auth_utils import user_dependency
from app.utils import series_utils

SeriesRouter = APIRouter(
    prefix="/series", 
    tags=["series"]
)

@SeriesRouter.get("/", response_model=list[Series])
async def list_series():
    return series_utils.get_all_series()

@SeriesRouter.get("/{series_id}", response_model=Series)
async def get_series(series_id: int):
    series = series_utils.get_series_by_id(series_id)
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    return series

@SeriesRouter.post("/", response_model=Series, status_code=status.HTTP_201_CREATED)
async def create_series(request: CreateSeriesRequest, current_user: user_dependency):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    existing = series_utils.get_series_by_slug(request.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    return series_utils.create_series(request.name, request.slug, request.cover_url)

@SeriesRouter.delete("/{series_id}", status_code=status.HTTP_200_OK)
async def delete_series(series_id: int, current_user: user_dependency):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    series = series_utils.get_series_by_id(series_id)
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    series_utils.delete_series(series_id)
    return {"message": "Series deleted"}