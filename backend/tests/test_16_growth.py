"""
Leviers de croissance : quête de démarrage, récompenses des créateurs,
notifications de résultat, "closing soon", follows et métriques admin.
"""
import os
from datetime import datetime, timedelta, UTC

import psycopg
import pytest
from psycopg.rows import dict_row


def _db():
    return psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row, autocommit=True)


def _new_user(client, name: str) -> dict:
    resp = client.post("/auth/signup", json={"username": name, "email": f"{name}@test.local", "password": "growthpass1"})
    assert resp.status_code == 200, resp.text
    token = client.post("/auth/token", data={"username": name, "password": "growthpass1"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _balance(client, headers) -> int:
    return client.get("/auth/get-user", headers=headers).json()["points_balance"]


def _transactions(username: str, kind: str) -> list[dict]:
    with _db() as conn:
        return conn.execute(
            'SELECT pt.* FROM point_transactions pt JOIN "User" u ON u.id = pt.user_id WHERE u.username = %s AND pt.kind = %s',
            (username, kind),
        ).fetchall()


@pytest.fixture(scope="module")
def players(client):
    return {name: _new_user(client, name) for name in ("creator", "winner", "loser", "newbie")}


@pytest.fixture(scope="module")
def community_event(client, admin_headers, players):
    """Pari proposé par 'creator', approuvé par l'admin."""
    series = client.get("/series/").json()[0]
    proposal = client.post("/events/propose", json={
        "title": "Growth: will the community call it?", "series_id": series["id"], "outcomes": ["Yes", "No"],
    }, headers=players["creator"]).json()
    resp = client.post(f"/events/proposals/{proposal['id']}/approve", json={"fee_bps": 200}, headers=admin_headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Créateurs ────────────────────────────────────────────────────────────────

@pytest.mark.order(160)
def test_approved_proposal_pays_the_creator(client, players, community_event):
    assert _balance(client, players["creator"]) == 10000 + 500
    assert len(_transactions("creator", "proposal_approved")) == 1
    notifs = client.get("/notifications/me", headers=players["creator"]).json()
    assert any(n["type"] == "proposal_approved" for n in notifs)


@pytest.mark.order(161)
def test_market_shows_who_proposed_it(client, community_event):
    assert client.get(f"/events/{community_event['id']}").json()["proposed_by_username"] == "creator"


@pytest.mark.order(162)
def test_self_approved_proposal_earns_nothing(client, admin_headers):
    series = client.get("/series/").json()[0]
    proposal = client.post("/events/propose", json={
        "title": "Admin's own idea", "series_id": series["id"], "outcomes": ["Yes", "No"],
    }, headers=admin_headers).json()
    client.post(f"/events/proposals/{proposal['id']}/approve", json={}, headers=admin_headers)
    assert _transactions("test_admin", "proposal_approved") == []


@pytest.mark.order(163)
def test_payout_pays_creator_cut_once_from_the_fee(client, admin_headers, players, community_event):
    event_id = community_event["id"]
    yes, no = (next(o for o in community_event["outcomes"] if o["outcome"] == label) for label in ("Yes", "No"))
    client.post("/bets/", json={"event_id": event_id, "outcome_id": yes["id"], "points_placed": 1000}, headers=players["winner"])
    client.post("/bets/", json={"event_id": event_id, "outcome_id": no["id"], "points_placed": 3000}, headers=players["loser"])

    client.post(f"/events/{event_id}/resolve", json={
        "winning_outcome_id": yes["id"], "evidence_url": "https://example.com/proof",
    }, headers=admin_headers)
    assert client.post(f"/events/{event_id}/finalize-payout", headers=admin_headers).status_code == 200

    # Cagnotte 4000 : le gagnant reçoit 98 % (3920), le créateur 0,5 % (20),
    # pris sur les 2 % de fee — rien n'est créé au-delà de la cagnotte.
    cut = _transactions("creator", "creator_cut")
    assert [t["amount"] for t in cut] == [20]
    won = _transactions("winner", "bet_won")
    assert won[0]["amount"] + cut[0]["amount"] <= 4000

    # Un second finalize est refusé et ne repaie rien.
    assert client.post(f"/events/{event_id}/finalize-payout", headers=admin_headers).status_code == 409
    assert len(_transactions("creator", "creator_cut")) == 1


@pytest.mark.order(164)
def test_bettors_are_notified_of_the_result(client, players, community_event):
    won = [n for n in client.get("/notifications/me", headers=players["winner"]).json() if n["type"] == "bet_won"]
    assert won and won[0]["payload"]["payout"] == 3920 and won[0]["payload"]["event_id"] == community_event["id"]
    lost = client.get("/notifications/me", headers=players["loser"]).json()
    assert any(n["type"] == "bet_lost" for n in lost)


@pytest.mark.order(165)
def test_won_bet_carries_its_payout(client, players):
    bets = client.get("/bets/me", headers=players["winner"]).json()
    assert any(b["status"] == "won" and b["payout"] == 3920 for b in bets)


@pytest.mark.order(166)
def test_top_creators_ranking(client):
    creators = client.get("/rank/creators").json()
    me = next(c for c in creators if c["username"] == "creator")
    assert me["approved_markets"] >= 1 and me["creator_earnings"] == 520


# ── Quête de démarrage ───────────────────────────────────────────────────────

@pytest.mark.order(167)
def test_starter_quest_rewards_once_and_only_when_done(client, admin_headers, players):
    newbie = players["newbie"]
    quests = {q["key"]: q for q in client.get("/quests/starter", headers=newbie).json()}
    assert set(quests) == {"first_bet", "first_game", "first_proposal", "set_avatar"}
    assert not quests["first_bet"]["completed"]

    assert client.post("/quests/starter/first_bet/claim", headers=newbie).status_code == 409  # pas encore fait
    assert client.post("/quests/starter/nope/claim", headers=newbie).status_code == 409

    event = client.post("/events/", json={"title": "Quest market", "outcomes": ["A", "B"]}, headers=admin_headers).json()
    client.post("/bets/", json={"event_id": event["id"], "outcome_id": event["outcomes"][0]["id"], "points_placed": 100}, headers=newbie)
    before = _balance(client, newbie)

    resp = client.post("/quests/starter/first_bet/claim", headers=newbie)
    assert resp.status_code == 200 and resp.json()["new_balance"] == before + 500
    assert client.post("/quests/starter/first_bet/claim", headers=newbie).status_code == 409  # une seule fois
    quests = {q["key"]: q for q in client.get("/quests/starter", headers=newbie).json()}
    assert quests["first_bet"]["claimed"] is True


# ── Closing soon ─────────────────────────────────────────────────────────────

@pytest.mark.order(168)
def test_closing_soon_sorts_open_markets_by_deadline(client, admin_headers):
    now = datetime.now(UTC)
    for hours, title in ((48, "Closes later"), (2, "Closes first")):
        client.post("/events/", json={
            "title": title, "outcomes": ["A", "B"], "locks_at": (now + timedelta(hours=hours)).isoformat(),
        }, headers=admin_headers)
    events = client.get("/events/?sort=closing&limit=100").json()
    deadlines = [e["locks_at"] for e in events]
    assert deadlines == sorted(deadlines) and all(e["status"] == "open" for e in events)
    titles = [e["title"] for e in events]
    assert titles.index("Closes first") < titles.index("Closes later")
    assert client.get("/events/?sort=nonsense").status_code == 422


# ── Follows ──────────────────────────────────────────────────────────────────

@pytest.mark.order(169)
def test_follow_and_friends_leaderboard(client, players):
    newbie = players["newbie"]
    assert client.post("/users/winner/follow", headers=newbie).status_code == 200
    assert client.post("/users/winner/follow", headers=newbie).status_code == 200  # idempotent
    assert client.get("/users/me/following", headers=newbie).json() == ["winner"]

    board = client.get("/rank/leaderboard/following", headers=newbie).json()
    assert {row["username"] for row in board} == {"newbie", "winner"}
    assert [row["rank"] for row in board] == [1, 2]

    assert client.post("/users/newbie/follow", headers=newbie).status_code == 400
    assert client.post("/users/ghost/follow", headers=newbie).status_code == 404
    client.delete("/users/winner/follow", headers=newbie)
    assert client.get("/users/me/following", headers=newbie).json() == []


# ── Métriques ────────────────────────────────────────────────────────────────

@pytest.mark.order(170)
def test_growth_metrics_are_admin_only(client, admin_headers, bettor_headers):
    from app.utils import growth_utils
    growth_utils.record_guest_play("trivia")
    growth_utils.record_guest_play("trivia")

    assert client.get("/admin/metrics", headers=bettor_headers).status_code == 403
    metrics = client.get("/admin/metrics", headers=admin_headers).json()
    assert metrics["guest_plays"]["last_7d"] >= 2
    assert metrics["signups"]["last_7d"] >= 4
    for key in ("first_bet_within_24h", "d7_retention", "community_market_share_30d",
                "proposals_submitted", "proposals_approved", "daily_completions", "bets_placed"):
        assert key in metrics
