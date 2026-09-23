from pydantic import BaseModel
from datetime import date as date_type, datetime
from typing import Optional


class DailyChallenge(BaseModel):
    """Version publique — jamais le champ answer, jamais transmis au client."""
    id: int
    challenge_date: date_type
    type: str
    content: dict
    created_at: Optional[datetime] = None


class CreateDailyChallengeRequest(BaseModel):
    challenge_date: date_type
    type: str  # "trivia" | "silhouette"
    content: dict
    answer: dict


class TriviaSubmitRequest(BaseModel):
    answers: list[int]  # un index de réponse par question, dans l'ordre


class SilhouetteGuessRequest(BaseModel):
    guess: str


class DailyAttemptResult(BaseModel):
    result: str  # "solved" | "failed" | None si silhouette pas encore conclue
    score: Optional[int] = None
    guesses_used: Optional[int] = None
    new_balance: Optional[int] = None
    current_streak: Optional[int] = None
    longest_streak: Optional[int] = None


class Streak(BaseModel):
    current_streak: int = 0
    longest_streak: int = 0
    last_completed_date: Optional[date_type] = None