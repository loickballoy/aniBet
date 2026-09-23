"""
Daily puzzles : trivia (soumission unique) et silhouette (essais progressifs).

Les deux formats partagent la colonne challenge_date avec une contrainte
UNIQUE — un seul challenge par vraie date calendaire. Pour tester les deux
formats dans la même session sans attendre le lendemain, on nettoie
explicitement entre les deux scénarios (nettoyage direct en base, même
pattern que la promotion admin dans conftest.py).
"""
import os
import pytest
import psycopg
from psycopg.rows import dict_row
from datetime import date


def _clean_todays_daily_data():
    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM daily_attempts")
            cur.execute("DELETE FROM daily_challenges")
        conn.commit()


@pytest.mark.order(80)
def test_admin_creates_trivia_for_today(client, admin_headers):
    today = date.today().isoformat()
    resp = client.post("/admin/daily-challenges", json={
        "challenge_date": today,
        "type": "trivia",
        "content": {"questions": [
            {"question": f"Q{i}", "options": ["a", "b"], "difficulty_weight": 1, "series": "OP"}
            for i in range(5)
        ]},
        "answer": {"correct_indices": [0, 0, 0, 0, 0]},
    }, headers=admin_headers)
    assert resp.status_code == 201


@pytest.mark.order(81)
def test_non_admin_cannot_create_challenge(client, bettor_headers):
    today = date.today().isoformat()
    resp = client.post("/admin/daily-challenges", json={
        "challenge_date": today, "type": "trivia",
        "content": {"questions": []}, "answer": {"correct_indices": []},
    }, headers=bettor_headers)
    assert resp.status_code == 403


@pytest.mark.order(82)
def test_todays_challenge_never_exposes_answer(client, bettor_headers):
    resp = client.get("/daily-challenges/today", headers=bettor_headers)
    assert resp.status_code == 200
    assert "answer" not in resp.json()["challenge"]
    assert "content" in resp.json()["challenge"]


@pytest.mark.order(83)
def test_submit_trivia_with_majority_correct_solves_it(client, bettor_headers):
    resp = client.post("/daily-challenges/today/trivia", json={"answers": [0, 0, 0, 1, 1]}, headers=bettor_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["result"] == "solved"
    assert body["correct_count"] == 3


@pytest.mark.order(84)
def test_cannot_resubmit_trivia_same_day(client, bettor_headers):
    resp = client.post("/daily-challenges/today/trivia", json={"answers": [0, 0, 0, 0, 0]}, headers=bettor_headers)
    assert resp.status_code == 409


@pytest.mark.order(85)
def test_streak_is_one_after_first_solve(client, bettor_headers):
    resp = client.get("/streaks/me", headers=bettor_headers)
    assert resp.status_code == 200
    assert resp.json()["current_streak"] == 1


@pytest.mark.order(86)
def test_silhouette_progressive_guesses(client, admin_headers, second_bettor_headers):
    _clean_todays_daily_data()

    today = date.today().isoformat()
    resp_create = client.post("/admin/daily-challenges", json={
        "challenge_date": today, "type": "silhouette",
        "content": {"image_url": "https://x/blur.png", "hints": []},
        "answer": {"character_name": "Luffy", "series": "One Piece"},
    }, headers=admin_headers)
    assert resp_create.status_code == 201

    resp = client.post("/daily-challenges/today/silhouette/guess", json={"guess": "Zoro"}, headers=second_bettor_headers)
    assert resp.status_code == 200
    assert resp.json()["result"] is None  # pas encore conclu

    resp = client.post("/daily-challenges/today/silhouette/guess", json={"guess": "luffy"}, headers=second_bettor_headers)
    assert resp.status_code == 200
    assert resp.json()["result"] == "solved"


@pytest.mark.order(87)
def test_second_bettor_streak_is_one(client, second_bettor_headers):
    resp = client.get("/streaks/me", headers=second_bettor_headers)
    assert resp.status_code == 200
    assert resp.json()["current_streak"] == 1