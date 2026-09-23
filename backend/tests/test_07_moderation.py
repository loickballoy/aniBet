"""
Modération : mod scopes, propositions communautaires, fenêtre de dispute.
"""
import pytest


@pytest.mark.order(60)
def test_non_admin_cannot_grant_mod_scope(client, bettor_headers, second_bettor_id):
    resp = client.post("/admin/mod-scopes", json={
        "user_id": second_bettor_id, "series_id": 1,
    }, headers=bettor_headers)
    assert resp.status_code == 403


@pytest.mark.order(61)
def test_admin_grants_mod_scope_to_bettor2(client, admin_headers, second_bettor_id):
    series = client.get("/series/").json()[0]

    resp = client.post("/admin/mod-scopes", json={
        "user_id": second_bettor_id, "series_id": series["id"],
    }, headers=admin_headers)
    assert resp.status_code == 201
    assert resp.json()["active"] is True


@pytest.mark.order(62)
def test_any_user_can_propose_event(client, bettor_headers):
    series = client.get("/series/").json()[0]

    resp = client.post("/events/propose", json={
        "title": "Nouveau perso révélé ce mois-ci ?",
        "series_id": series["id"],
        "outcomes": ["Oui", "Non"],
        "source_url": "https://example.com/preuve-proposition",
    }, headers=bettor_headers)
    assert resp.status_code == 201
    assert resp.json()["status"] == "pending"


@pytest.mark.order(63)
def test_proposal_needs_at_least_two_outcomes(client, bettor_headers):
    series = client.get("/series/").json()[0]
    resp = client.post("/events/propose", json={
        "title": "Proposition invalide",
        "series_id": series["id"],
        "outcomes": ["Seul"],
        "source_url": "https://example.com/x",
    }, headers=bettor_headers)
    assert resp.status_code == 400


@pytest.mark.order(64)
def test_mod_sees_pending_proposal_in_scope(client, second_bettor_headers):
    resp = client.get("/events/proposals/pending", headers=second_bettor_headers)
    assert resp.status_code == 200
    titles = [p["title"] for p in resp.json()]
    assert "Nouveau perso révélé ce mois-ci ?" in titles


@pytest.mark.order(65)
def test_non_mod_sees_no_pending_proposals(client, bettor_headers):
    resp = client.get("/events/proposals/pending", headers=bettor_headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.order(66)
def test_mod_approves_proposal_creates_real_event(client, second_bettor_headers):
    proposals = client.get("/events/proposals/pending", headers=second_bettor_headers).json()
    proposal = proposals[0]

    resp = client.post(f"/events/proposals/{proposal['id']}/approve", json={
        "fee_bps": 200,
    }, headers=second_bettor_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "open"
    assert len(body["outcomes"]) == 2


@pytest.mark.order(67)
def test_mod_cannot_bet_on_event_in_own_scope(client, second_bettor_headers):
    events = client.get("/events/").json()
    event = next(e for e in events if e["title"] == "Nouveau perso révélé ce mois-ci ?")
    outcome_id = event["outcomes"][0]["id"]

    resp = client.post("/bets/", json={
        "event_id": event["id"], "outcome_id": outcome_id, "points_placed": 500,
    }, headers=second_bettor_headers)
    assert resp.status_code == 409
    assert "scope" in resp.json()["detail"].lower()


@pytest.mark.order(68)
def test_resolve_requires_evidence_url(client, second_bettor_headers):
    events = client.get("/events/").json()
    event = next(e for e in events if e["title"] == "Nouveau perso révélé ce mois-ci ?")
    outcome_id = event["outcomes"][0]["id"]

    resp = client.post(f"/events/{event['id']}/resolve", json={
        "winning_outcome_id": outcome_id, "evidence_url": "https://example.com/resolution",
    }, headers=second_bettor_headers)
    assert resp.status_code == 200

    event_after = client.get(f"/events/{event['id']}").json()
    assert event_after["status"] == "resolved_pending_dispute"


@pytest.mark.order(69)
def test_finalize_payout_blocked_while_disputed(client, bettor_headers, second_bettor_headers):
    events = client.get("/events/").json()
    event = next(e for e in events if e["title"] == "Nouveau perso révélé ce mois-ci ?")

    dispute_resp = client.post(f"/events/{event['id']}/dispute", json={
        "counter_evidence_url": "https://example.com/contre-preuve",
    }, headers=bettor_headers)
    assert dispute_resp.status_code == 201

    event_after = client.get(f"/events/{event['id']}").json()
    assert event_after["status"] == "disputed"

    finalize_resp = client.post(f"/events/{event['id']}/finalize-payout", headers=second_bettor_headers)
    assert finalize_resp.status_code == 409