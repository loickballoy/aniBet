"""
Daily puzzles : trivia (soumission unique) et silhouette (essais progressifs).
Les deux partagent la logique streak/récompense via les fonctions SQL
fn_submit_trivia_attempt / fn_submit_silhouette_guess.
"""

from datetime import date as date_type

from psycopg.types.json import Json

from app.db import pool
from app.models.daily import DailyChallenge, Streak

TRIVIA_REWARD = 200
SILHOUETTE_REWARD = 150
MAX_SILHOUETTE_GUESSES = 6

# Solved = au moins 3/5 bonnes réponses. Un score parfait (5/5) rapporterait
# plus de points via difficulty_weight, mais exiger 5/5 pour garder son
# streak serait trop punitif vu que certaines questions sont volontairement
# difficiles — ajuste cette constante si besoin après avoir observé les
# vrais taux de réussite.
TRIVIA_PASS_THRESHOLD = 3


def get_challenge_for_date(challenge_date: date_type) -> DailyChallenge | None:
    """Version publique — ne renvoie jamais la colonne answer."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, challenge_date, type, content, created_at FROM daily_challenges WHERE challenge_date = %s",
                (challenge_date,),
            )
            row = cur.fetchone()
    return DailyChallenge(**row) if row else None


def _get_answer_for_challenge(challenge_id: int) -> dict:
    """Privé — jamais exposé via une route publique."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT answer FROM daily_challenges WHERE id = %s", (challenge_id,))
            row = cur.fetchone()
    if row is None:
        raise ValueError("Challenge not found")
    return row["answer"]


def create_challenge(challenge_date: date_type, type_: str, content: dict, answer: dict) -> DailyChallenge:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO daily_challenges (challenge_date, type, content, answer)
                VALUES (%s, %s, %s, %s)
                RETURNING id, challenge_date, type, content, created_at
                """,
                (challenge_date, type_, Json(content), Json(answer)),
            )
            row = cur.fetchone()
        conn.commit()
    return DailyChallenge(**row)


def get_existing_attempt(user_id: int, challenge_id: int) -> dict | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM daily_attempts WHERE user_id = %s AND challenge_id = %s",
                (user_id, challenge_id),
            )
            return cur.fetchone()


def submit_trivia(user_id: int, challenge_id: int, challenge_date: date_type, answers: list[int]) -> dict:
    answer = _get_answer_for_challenge(challenge_id)
    correct_indices = answer["correct_indices"]

    if len(answers) != len(correct_indices):
        raise ValueError(f"Expected {len(correct_indices)} answers, got {len(answers)}")

    challenge = get_challenge_for_date(challenge_date)
    weights = [q["difficulty_weight"] for q in challenge.content["questions"]]

    correct_count = 0
    score = 0
    for given, correct, weight in zip(answers, correct_indices, weights):
        if given == correct:
            correct_count += 1
            score += weight

    solved = correct_count >= TRIVIA_PASS_THRESHOLD
    reward = TRIVIA_REWARD if solved else 0

    with pool.connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    SELECT fn_submit_trivia_attempt(
                        %s::integer, %s::integer, %s::date, %s::jsonb, %s::integer, %s::boolean, %s::integer
                    )
                    """,
                    (user_id, challenge_id, challenge_date, Json(answers), score, solved, reward),
                )
            except Exception as e:
                conn.rollback()
                raise ValueError(str(e)) from e
        conn.commit()

    return {"result": "solved" if solved else "failed", "score": score, "correct_count": correct_count}


def submit_silhouette_guess(user_id: int, challenge_id: int, challenge_date: date_type, guess: str) -> dict:
    answer = _get_answer_for_challenge(challenge_id)
    correct_name = answer["character_name"]

    guess_correct = guess.strip().lower() == correct_name.strip().lower()

    with pool.connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    SELECT * FROM fn_submit_silhouette_guess(
                        %s::integer, %s::integer, %s::date, %s::text, %s::boolean, %s::integer, %s::integer
                    )
                    """,
                    (user_id, challenge_id, challenge_date, guess, guess_correct,
                     MAX_SILHOUETTE_GUESSES, SILHOUETTE_REWARD),
                )
                row = cur.fetchone()
            except Exception as e:
                conn.rollback()
                raise ValueError(str(e)) from e
        conn.commit()

    return {"result": row["result"], "guesses_used": row["guesses_used"], "guess_correct": guess_correct}


def get_streak(user_id: int) -> Streak:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM streaks WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
    return Streak(**row) if row else Streak()