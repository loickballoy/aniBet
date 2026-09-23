"""
AniConnections : grille 4×4, 5 essais fixes (pas d'extension, décision
explicite de ne pas monétiser ce mécanisme).
"""
import pytest
from datetime import date, timedelta


def _current_week_of() -> str:
    """Même logique que weekly_utils.get_current_week_start()."""
    today = date.today()
    days_since_sunday = (today.weekday() + 1) % 7
    return (today - timedelta(days=days_since_sunday)).isoformat()


@pytest.mark.order(90)
def test_non_admin_cannot_create_weekly_puzzle(client, bettor_headers):
    grid = [{"id": i, "name": f"P{i}"} for i in range(16)]
    categories = [{"label": "A", "character_ids": [0, 1, 2, 3]}]
    resp = client.post("/admin/weekly-connections", json={
        "week_of": _current_week_of(), "grid": grid, "categories": categories,
    }, headers=bettor_headers)
    assert resp.status_code == 403


@pytest.mark.order(91)
def test_puzzle_requires_exactly_16_characters_and_4_categories(client, admin_headers):
    resp = client.post("/admin/weekly-connections", json={
        "week_of": _current_week_of(),
        "grid": [{"id": 0, "name": "Solo"}],  # pas 16
        "categories": [{"label": "A", "character_ids": [0]}],
    }, headers=admin_headers)
    assert resp.status_code == 400


@pytest.mark.order(92)
def test_admin_creates_weekly_puzzle(client, admin_headers):
    grid = [{"id": i, "name": f"P{i}"} for i in range(16)]
    categories = [
        {"label": "Capitaines", "character_ids": [0, 1, 2, 3]},
        {"label": "Épéistes", "character_ids": [4, 5, 6, 7]},
        {"label": "Docteurs", "character_ids": [8, 9, 10, 11]},
        {"label": "Cuisiniers", "character_ids": [12, 13, 14, 15]},
    ]
    resp = client.post("/admin/weekly-connections", json={
        "week_of": _current_week_of(), "grid": grid, "categories": categories,
    }, headers=admin_headers)
    assert resp.status_code == 201


@pytest.mark.order(93)
def test_current_puzzle_never_exposes_categories(client, bettor_headers):
    resp = client.get("/weekly-connections/current", headers=bettor_headers)
    assert resp.status_code == 200
    puzzle = resp.json()["puzzle"]
    assert len(puzzle["grid"]) == 16
    assert "categories" not in puzzle


@pytest.mark.order(94)
def test_wrong_guess_increments_mistakes_without_concluding(client, bettor_headers):
    resp = client.post("/weekly-connections/current/guess", json={"character_ids": [0, 4, 8, 12]}, headers=bettor_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["guess_correct"] is False
    assert body["mistakes"] == 1
    assert body["solved"] is False
    assert body["failed"] is False


@pytest.mark.order(95)
def test_correct_guesses_solve_the_puzzle(client, bettor_headers):
    groups = [
        ([0, 1, 2, 3], "Capitaines"),
        ([4, 5, 6, 7], "Épéistes"),
        ([8, 9, 10, 11], "Docteurs"),
        ([12, 13, 14, 15], "Cuisiniers"),
    ]
    last = None
    for ids, label in groups:
        resp = client.post("/weekly-connections/current/guess", json={"character_ids": ids}, headers=bettor_headers)
        assert resp.status_code == 200
        assert resp.json()["matched_category"] == label
        last = resp.json()

    assert last["solved"] is True
    assert len(last["found_categories"]) == 4


@pytest.mark.order(96)
def test_puzzle_rewards_scale_down_with_mistakes(client, bettor_headers):
    """
    1 faute a été commise avant la résolution (test 94) -> reward =
    max(200, 1000 - 1*150) = 850. Le solde de test_bettor avant ce test
    reflète déjà tout son historique (paris, saisons...) — on vérifie donc
    la variation entre transactions plutôt qu'un solde absolu.
    """
    resp = client.get("/transactions/me", headers=bettor_headers)
    assert resp.status_code == 200
    reward_amounts = [tx["amount"] for tx in resp.json() if tx["kind"] == "daily_reward"]
    assert 850 in reward_amounts, f"Récompenses daily_reward trouvées : {reward_amounts}"