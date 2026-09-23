"""Ranking (leaderboard, tiers) et transactions (winrate)."""
import pytest


@pytest.mark.order(50)
def test_tiers_are_returned(client):
    resp = client.get("/rank/leaderboard/tiers")
    assert resp.status_code == 200
    names = [t["name"] for t in resp.json()]
    assert names == ["Iron", "Bronze", "Silver", "Gold", "Diamond"]


@pytest.mark.order(51)
def test_leaderboard_includes_bettor_with_correct_tier(client, bettor_headers):
    resp = client.get("/rank/leaderboard")
    assert resp.status_code == 200
    entries = {e["username"]: e for e in resp.json()}
    assert "test_bettor" in entries
    # 9980 points (après le pari + payout du test_04) → tranche Bronze (1000-19999)
    assert entries["test_bettor"]["tier"] == "Bronze"


@pytest.mark.order(52)
def test_my_rank_returns_a_position(client, bettor_headers):
    resp = client.get("/rank/leaderboard/me", headers=bettor_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), int)
    assert resp.json() >= 1


@pytest.mark.order(53)
def test_winrate_reflects_the_won_bet(client, bettor_headers):
    resp = client.get("/transactions/winrate", headers=bettor_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["won"] == 1
    assert body["lost"] == 0
    assert body["winrate"] == 100.0
