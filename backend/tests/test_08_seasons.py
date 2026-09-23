"""
Saisons : le leaderboard bascule sur le gain net pendant une saison active,
le classement se fige à la clôture, le Hall of Fame garde le champion.
"""
import pytest
from datetime import datetime, timedelta, UTC


@pytest.mark.order(70)
def test_no_active_season_by_default(client):
    resp = client.get("/seasons/active")
    assert resp.status_code == 200
    assert resp.json() is None


@pytest.mark.order(71)
def test_non_admin_cannot_create_season(client, bettor_headers):
    now = datetime.now(UTC)
    resp = client.post("/admin/seasons", json={
        "starts_at": now.isoformat(), "ends_at": (now + timedelta(days=7)).isoformat(),
    }, headers=bettor_headers)
    assert resp.status_code == 403


@pytest.mark.order(72)
def test_admin_creates_active_season(client, admin_headers):
    now = datetime.now(UTC)
    resp = client.post("/admin/seasons", json={
        "starts_at": (now - timedelta(hours=1)).isoformat(),
        "ends_at": (now + timedelta(days=7)).isoformat(),
    }, headers=admin_headers)
    assert resp.status_code == 201
    assert resp.json()["status"] == "active"


@pytest.mark.order(73)
def test_cannot_create_second_active_season(client, admin_headers):
    now = datetime.now(UTC)
    resp = client.post("/admin/seasons", json={
        "starts_at": now.isoformat(), "ends_at": (now + timedelta(days=7)).isoformat(),
    }, headers=admin_headers)
    assert resp.status_code == 400


@pytest.mark.order(74)
def test_leaderboard_switches_to_season_net_gain(client, bettor_headers):
    """
    À ce stade (après test_04_betting et test_07_moderation), test_bettor a
    déjà un solde de 9980 (gagné un pari) et une activité antérieure à cette
    saison. Le point ici n'est pas de vérifier une valeur précise — juste
    que season_net_gain apparaît maintenant dans la réponse, preuve que la
    bascule a bien eu lieu.
    """
    resp = client.get("/rank/leaderboard")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) > 0
    assert "season_net_gain" in entries[0]


@pytest.mark.order(75)
def test_admin_ends_season_and_freezes_leaderboard(client, admin_headers):
    active = client.get("/seasons/active").json()
    season_id = active["id"]

    resp = client.post(f"/admin/seasons/{season_id}/end", headers=admin_headers)
    assert resp.status_code == 200

    frozen = client.get(f"/seasons/{season_id}/leaderboard").json()
    assert len(frozen) > 0
    assert frozen[0]["final_rank"] == 1
    assert frozen[0]["tier"] is not None


@pytest.mark.order(76)
def test_hall_of_fame_shows_champion(client):
    resp = client.get("/seasons/hall-of-fame")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) >= 1
    assert "champion_username" in entries[0]


@pytest.mark.order(77)
def test_no_active_season_after_ending(client):
    resp = client.get("/seasons/active")
    assert resp.status_code == 200
    assert resp.json() is None