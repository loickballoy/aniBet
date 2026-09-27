"""
Jeu en invité : on joue sans compte, rien n'est enregistré, aucune
récompense. Et correctif AniConnections : les groupes déjà trouvés sont
renvoyés pendant la partie (sinon la grille ne peut pas les retirer).
"""
import os
from datetime import date

import psycopg
import pytest
from psycopg.rows import dict_row


def _db():
    return psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row, autocommit=True)


def _reset_today(client, admin_headers, type_, content, answer):
    with _db() as conn:
        conn.execute("DELETE FROM daily_attempts")
        conn.execute("DELETE FROM daily_challenges")
    resp = client.post("/admin/daily-challenges", json={
        "challenge_date": date.today().isoformat(), "type": type_, "content": content, "answer": answer,
    }, headers=admin_headers)
    assert resp.status_code == 201


def _attempt_count():
    with _db() as conn:
        return conn.execute("SELECT COUNT(*) AS n FROM daily_attempts").fetchone()["n"]


# ── Daily ────────────────────────────────────────────────────────────────────

@pytest.mark.order(130)
def test_guest_can_load_todays_challenge_without_token(client, admin_headers):
    _reset_today(client, admin_headers, "trivia",
                 {"questions": [{"question": f"Q{i}", "options": ["a", "b"], "difficulty_weight": 1, "series": "S"} for i in range(5)]},
                 {"correct_indices": [0, 0, 0, 0, 0]})
    resp = client.get("/daily-challenges/today")
    assert resp.status_code == 200
    body = resp.json()
    assert body["attempt"] is None and body["revealed_answer"] is None
    assert "answer" not in body["challenge"]


@pytest.mark.order(131)
def test_invalid_token_is_treated_as_guest(client):
    resp = client.get("/daily-challenges/today", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 200
    assert resp.json()["attempt"] is None


@pytest.mark.order(132)
def test_guest_trivia_is_graded_but_never_saved(client):
    before = _attempt_count()
    resp = client.post("/daily-challenges/today/trivia/guest", json={"answers": [0, 0, 0, 1, 1]})
    assert resp.status_code == 200
    body = resp.json()
    assert body["result"] == "solved" and body["correct_count"] == 3
    assert body["correct_indices"] == [0, 0, 0, 0, 0]
    assert _attempt_count() == before  # rien d'enregistré pour un invité


@pytest.mark.order(133)
def test_guest_silhouette_reveals_only_when_finished(client, admin_headers):
    _reset_today(client, admin_headers, "silhouette",
                 {"image_url": "https://x/blur.png", "hints": []},
                 {"character_name": "Luffy", "series": "One Piece"})
    wrong = client.post("/daily-challenges/today/silhouette/guest", json={"guess": "Zoro"}).json()
    assert wrong == {"guess_correct": False, "answer": None}
    last_wrong = client.post("/daily-challenges/today/silhouette/guest", json={"guess": "Zoro", "final": True}).json()
    assert last_wrong["answer"]["character_name"] == "Luffy"
    right = client.post("/daily-challenges/today/silhouette/guest", json={"guess": " luffy "}).json()
    assert right["guess_correct"] is True
    assert _attempt_count() == 0


@pytest.mark.order(134)
def test_guest_endpoint_refuses_wrong_game_type(client):
    # Aujourd'hui c'est une silhouette : la trivia invité doit refuser.
    assert client.post("/daily-challenges/today/trivia/guest", json={"answers": [0]}).status_code == 400


# ── Weekly ───────────────────────────────────────────────────────────────────

@pytest.mark.order(135)
def test_guest_can_load_weekly_without_token(client):
    resp = client.get("/weekly-connections/current")
    assert resp.status_code == 200
    body = resp.json()
    assert body["attempt"] is None and body["found_groups"] == []
    assert "categories" not in body["puzzle"]


@pytest.mark.order(136)
def test_guest_weekly_guess_and_reveal(client):
    # Puzzle créé par test_10 : "Capitaines" = personnages 0 à 3.
    right = client.post("/weekly-connections/current/guest-guess", json={"character_ids": [0, 1, 2, 3]}).json()
    assert right == {"guess_correct": True, "matched_category": "Capitaines"}
    wrong = client.post("/weekly-connections/current/guest-guess", json={"character_ids": [0, 4, 8, 12]}).json()
    assert wrong["guess_correct"] is False
    assert len(client.get("/weekly-connections/current/guest-reveal").json()) == 4


@pytest.mark.order(137)
def test_logged_in_player_gets_found_groups_during_play(client, second_bettor_headers):
    # Correctif : pendant la partie, les groupes trouvés arrivent avec leurs
    # personnages, pour que la grille puisse les retirer et afficher les noms.
    client.post("/weekly-connections/current/guess", json={"character_ids": [0, 1, 2, 3]}, headers=second_bettor_headers)
    body = client.get("/weekly-connections/current", headers=second_bettor_headers).json()
    assert body["revealed_categories"] is None  # partie pas finie : pas de fuite
    assert body["found_groups"] == [{"label": "Capitaines", "character_ids": [0, 1, 2, 3]}]
