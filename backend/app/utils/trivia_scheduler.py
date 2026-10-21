"""
Trivia automatique : lundi, mercredi, vendredi et dimanche, une trivia de 5
questions est générée depuis la banque app/data/trivia_bank.json si l'admin
n'a rien programmé ce jour-là. Les autres jours restent libres (silhouette).

- Chaque question de la banque a un id stable ("op-001") recopié dans le
  content du challenge (bank_id) : c'est ce qui permet de ne pas reposer une
  question tant que la banque n'est pas épuisée.
- Banque épuisée : on repart des questions posées le moins récemment.
- Le tirage est seedé par la date : deux workers qui génèrent le même jour
  en même temps produisent la même trivia, et l'INSERT ... ON CONFLICT
  garantit qu'une seule ligne est créée.
- Pour ajouter des questions : éditer le JSON (id unique, 1 bonne réponse,
  3 mauvaises, difficulty 1/2/3). Aucune migration nécessaire.
"""

import json
import random
from datetime import date as date_type, timedelta
from functools import lru_cache
from pathlib import Path

from psycopg.types.json import Json

from app.db import pool

BANK_PATH = Path(__file__).resolve().parent.parent / "data" / "trivia_bank.json"

TRIVIA_WEEKDAYS = {0, 2, 4, 6}  # lundi, mercredi, vendredi, dimanche
QUESTIONS_PER_DAY = 5
# 2 faciles, 2 moyennes, 1 difficile : 3/5 suffit à garder son streak.
DIFFICULTY_SLOTS = [1, 1, 2, 2, 3]


@lru_cache(maxsize=1)
def load_bank() -> tuple[dict, ...]:
    with open(BANK_PATH, encoding="utf-8") as f:
        bank = json.load(f)

    seen = set()
    for q in bank:
        if q["id"] in seen:
            raise ValueError(f"Duplicate trivia id in bank: {q['id']}")
        seen.add(q["id"])
        if len(q["wrong"]) != 3 or q["answer"] in q["wrong"]:
            raise ValueError(f"Trivia {q['id']} needs exactly 3 wrong answers, distinct from the answer")
        if q["difficulty"] not in (1, 2, 3):
            raise ValueError(f"Trivia {q['id']} has an invalid difficulty")
    return tuple(bank)


def is_trivia_day(day: date_type) -> bool:
    return day.weekday() in TRIVIA_WEEKDAYS


def _last_used_dates() -> dict[str, date_type]:
    """bank_id -> dernière date où la question a été posée (ou programmée)."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT q->>'bank_id' AS bank_id, max(challenge_date) AS last_used
                FROM daily_challenges, jsonb_array_elements(content->'questions') AS q
                WHERE type = 'trivia' AND q ? 'bank_id'
                GROUP BY 1
                """
            )
            return {row["bank_id"]: row["last_used"] for row in cur.fetchall()}


def pick_questions(day: date_type, last_used: dict[str, date_type]) -> list[dict]:
    """Choisit les questions du jour : jamais posées d'abord, sinon les plus
    anciennes, en évitant deux questions de la même série le même jour."""
    rng = random.Random(f"anibet-trivia-{day.isoformat()}")
    bank = list(load_bank())
    rng.shuffle(bank)  # départage aléatoire (mais déterministe) des ex aequo
    bank.sort(key=lambda q: last_used.get(q["id"], date_type.min))

    picked: list[dict] = []
    for difficulty in DIFFICULTY_SLOTS:
        used_series = {q["series"] for q in picked}
        used_ids = {q["id"] for q in picked}
        candidates = [q for q in bank if q["id"] not in used_ids]
        # Du plus strict au plus permissif : bonne difficulté + série nouvelle,
        # puis série nouvelle, puis n'importe quoi.
        choice = (
            next((q for q in candidates if q["difficulty"] == difficulty and q["series"] not in used_series), None)
            or next((q for q in candidates if q["series"] not in used_series), None)
            or next(iter(candidates), None)
        )
        if choice is None:
            break
        picked.append(choice)
    return picked


def build_challenge(day: date_type, last_used: dict[str, date_type]) -> tuple[dict, dict]:
    """(content public, answer) au format attendu par daily_challenges."""
    rng = random.Random(f"anibet-trivia-options-{day.isoformat()}")
    questions, correct_indices = [], []
    for q in pick_questions(day, last_used):
        options = [q["answer"], *q["wrong"]]
        rng.shuffle(options)
        questions.append({
            "question": q["question"],
            "options": options,
            "difficulty_weight": q["difficulty"],
            "series": q["series"],
            "bank_id": q["id"],
        })
        correct_indices.append(options.index(q["answer"]))
    return {"questions": questions}, {"correct_indices": correct_indices}


def ensure_trivia_for(day: date_type) -> bool:
    """Crée la trivia du jour si c'est un jour de trivia et que rien n'est
    programmé. Renvoie True si une ligne a été créée."""
    if not is_trivia_day(day):
        return False
    content, answer = build_challenge(day, _last_used_dates())
    if len(content["questions"]) < QUESTIONS_PER_DAY:
        return False
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO daily_challenges (challenge_date, type, content, answer)
                VALUES (%s, 'trivia', %s, %s)
                ON CONFLICT (challenge_date) DO NOTHING
                """,
                (day, Json(content), Json(answer)),
            )
            created = cur.rowcount == 1
        conn.commit()
    return created


def schedule_upcoming(start: date_type, days: int) -> list[date_type]:
    """Pré-remplit les jours de trivia de [start, start + days[ encore vides.
    Utile pour relire les questions dans le panel admin avant publication."""
    created = []
    for offset in range(days):
        day = start + timedelta(days=offset)
        if ensure_trivia_for(day):
            created.append(day)
    return created
