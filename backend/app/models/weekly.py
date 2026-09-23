from pydantic import BaseModel
from datetime import date as date_type, datetime
from typing import Optional


class WeeklyConnections(BaseModel):
    """Version publique — la grille EST le contenu public (pas de séparation
    content/answer comme pour les daily challenges) ; seul 'categories'
    (la clé de regroupement) reste privé côté serveur."""
    id: int
    week_of: date_type
    grid: list
    created_at: Optional[datetime] = None


class CreateWeeklyConnectionsRequest(BaseModel):
    week_of: date_type
    grid: list  # 16 personnages, ex: [{"id": 1, "name": "Luffy", "image_url": "..."}, ...]
    categories: list  # 4 catégories, ex: [{"label": "Capitaines", "character_ids": [1,5,9,12]}, ...]


class WeeklyGuessRequest(BaseModel):
    character_ids: list[int]  # exactement 4 ids


class WeeklyAttemptState(BaseModel):
    solved: Optional[bool] = None
    failed: bool = False
    mistakes: int = 0
    found_categories: list = []