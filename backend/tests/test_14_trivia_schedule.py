"""
Trivia automatique lun/mer/ven/dim depuis app/data/trivia_bank.json.

Les dates testées sont en 2099 pour ne jamais entrer en collision avec le
challenge "du jour" utilisé par les autres fichiers de test.
"""
import os
from datetime import date, timedelta

import psycopg
import pytest
from psycopg.rows import dict_row

MONDAY = date(2099, 1, 5)
TUESDAY = MONDAY + timedelta(days=1)


@pytest.fixture
def trivia_scheduler(client):
    # Import tardif : app.db ouvre son pool à l'import, il faut que conftest
    # ait recréé la base de test avant.
    from app.utils import trivia_scheduler
    return trivia_scheduler


def _db():
    return psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row, autocommit=True)


def _clean_daily():
    with _db() as conn:
        conn.execute("DELETE FROM daily_attempts")
        conn.execute("DELETE FROM daily_challenges")


def _answer_for(day: date) -> dict:
    with _db() as conn:
        return conn.execute("SELECT answer FROM daily_challenges WHERE challenge_date = %s", (day,)).fetchone()["answer"]


@pytest.mark.order(140)
def test_bank_is_valid_and_big_enough(trivia_scheduler):
    bank = trivia_scheduler.load_bank()
    assert len(bank) >= 200
    for q in bank:
        assert q["question"].strip() and q["answer"].strip() and q["series"].strip()


@pytest.mark.order(141)
def test_pick_mixes_difficulty_and_series(trivia_scheduler):
    picked = trivia_scheduler.pick_questions(MONDAY, {})
    assert len(picked) == 5
    assert [q["difficulty"] for q in picked] == [1, 1, 2, 2, 3]
    assert len({q["series"] for q in picked}) == 5


@pytest.mark.order(142)
def test_build_is_deterministic_and_answers_line_up(trivia_scheduler):
    content, answer = trivia_scheduler.build_challenge(MONDAY, {})
    assert (content, answer) == trivia_scheduler.build_challenge(MONDAY, {})
    bank = {q["id"]: q for q in trivia_scheduler.load_bank()}
    for q, idx in zip(content["questions"], answer["correct_indices"]):
        assert q["options"][idx] == bank[q["bank_id"]]["answer"]
        assert len(q["options"]) == 4


@pytest.mark.order(143)
def test_trivia_days_are_auto_filled_and_other_days_are_not(trivia_scheduler):
    from app.utils import daily_utils
    _clean_daily()

    assert [trivia_scheduler.is_trivia_day(MONDAY + timedelta(days=i)) for i in range(7)] == \
        [True, False, True, False, True, False, True]

    challenge = daily_utils.get_challenge_for_date(MONDAY)
    assert challenge is not None and challenge.type == "trivia"
    assert len(challenge.content["questions"]) == 5
    # Le content public ne contient jamais la réponse.
    assert "answer" not in challenge.content["questions"][0]

    assert daily_utils.get_challenge_for_date(TUESDAY) is None
    # Un second appel relit la même ligne au lieu d'en recréer une.
    assert daily_utils.get_challenge_for_date(MONDAY).id == challenge.id


@pytest.mark.order(144)
def test_no_question_repeats_until_bank_is_exhausted(trivia_scheduler):
    _clean_daily()
    days = 56  # 8 semaines = 32 trivias = 160 questions
    created = trivia_scheduler.schedule_upcoming(MONDAY, days)
    assert len(created) == 32
    with _db() as conn:
        rows = conn.execute(
            "SELECT q->>'bank_id' AS id FROM daily_challenges, jsonb_array_elements(content->'questions') q"
        ).fetchall()
    ids = [r["id"] for r in rows]
    assert len(ids) == 160 and len(set(ids)) == 160


@pytest.mark.order(145)
def test_never_overwrites_a_manual_challenge(trivia_scheduler, client, admin_headers):
    _clean_daily()
    resp = client.post("/admin/daily-challenges", json={
        "challenge_date": MONDAY.isoformat(), "type": "silhouette",
        "content": {"image_url": "https://x/blur.png", "hints": []},
        "answer": {"character_name": "Luffy", "series": "One Piece"},
    }, headers=admin_headers)
    assert resp.status_code == 201
    assert trivia_scheduler.ensure_trivia_for(MONDAY) is False
    assert _answer_for(MONDAY)["character_name"] == "Luffy"

    # Créer à la main sur une date déjà prise : 409 clair, plus de 500.
    dup = client.post("/admin/daily-challenges", json={
        "challenge_date": MONDAY.isoformat(), "type": "trivia",
        "content": {"questions": []}, "answer": {"correct_indices": []},
    }, headers=admin_headers)
    assert dup.status_code == 409


@pytest.mark.order(146)
def test_auto_schedule_endpoint_is_admin_only(client, admin_headers, bettor_headers):
    _clean_daily()
    assert client.post("/admin/daily-challenges/auto-schedule", headers=bettor_headers).status_code == 403
    assert client.post("/admin/daily-challenges/auto-schedule?days=500", headers=admin_headers).status_code == 400

    resp = client.post("/admin/daily-challenges/auto-schedule?days=7", headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()["created"]) == 4  # 4 jours de trivia dans toute fenêtre de 7 jours
    _clean_daily()
