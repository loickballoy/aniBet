"""
Paris + résolution : c'est le coeur transactionnel du système
(fn_place_bet / fn_resolve_event). Reproduit exactement le test manuel
qui avait validé le calcul de payout : 1000 points misés seuls sur un
outcome → 980 au retour (2% de fee), personne sur l'autre outcome.
"""
import pytest


@pytest.mark.order(30)
def test_bettor_starts_with_10000_points(client, bettor_headers):
    resp = client.get("/auth/get-user", headers=bettor_headers)
    assert resp.json()["points_balance"] == 10000


@pytest.mark.order(31)
def test_place_bet_deducts_balance_and_fills_pool(client, bettor_headers):
    event = client.get("/events/").json()[0]
    outcome_yes = next(o for o in event["outcomes"] if o["outcome"] == "Oui")

    resp = client.post("/bets/", json={
        "event_id": event["id"], "outcome_id": outcome_yes["id"], "points_placed": 1000,
    }, headers=bettor_headers)
    assert resp.status_code == 201
    assert resp.json()["status"] == "pending"

    balance = client.get("/auth/get-user", headers=bettor_headers).json()["points_balance"]
    assert balance == 9000, "Le solde doit être débité exactement du montant misé"

    event_after = client.get(f"/events/{event['id']}").json()
    yes_after = next(o for o in event_after["outcomes"] if o["outcome"] == "Oui")
    assert yes_after["pool_points"] == 1000


@pytest.mark.order(32)
def test_second_bet_on_same_event_is_rejected(client, bettor_headers):
    event = client.get("/events/").json()[0]
    outcome_no = next(o for o in event["outcomes"] if o["outcome"] == "Non")

    resp = client.post("/bets/", json={
        "event_id": event["id"], "outcome_id": outcome_no["id"], "points_placed": 500,
    }, headers=bettor_headers)
    assert resp.status_code == 400
    assert "already placed" in resp.json()["detail"].lower()


@pytest.mark.order(33)
def test_bet_with_insufficient_balance_is_rejected(client, second_bettor_headers):
    event = client.get("/events/").json()[0]
    outcome_yes = next(o for o in event["outcomes"] if o["outcome"] == "Oui")

    resp = client.post("/bets/", json={
        "event_id": event["id"], "outcome_id": outcome_yes["id"], "points_placed": 999999,
    }, headers=second_bettor_headers)
    assert resp.status_code == 400
    assert "funds" in resp.json()["detail"].lower()


@pytest.mark.order(34)
def test_non_admin_cannot_resolve_event(client, bettor_headers):
    event = client.get("/events/").json()[0]
    outcome_yes = next(o for o in event["outcomes"] if o["outcome"] == "Oui")

    resp = client.post(f"/events/{event['id']}/resolve", json={
        "winning_outcome_id": outcome_yes["id"], "evidence_url": "https://example.com/preuve",
    }, headers=bettor_headers)
    assert resp.status_code == 403


@pytest.mark.order(35)
def test_resolve_event_pays_out_correctly(client, admin_headers, bettor_headers):
    event = client.get("/events/").json()[0]
    outcome_yes = next(o for o in event["outcomes"] if o["outcome"] == "Oui")

    # Étape 1 : mark_resolution — marque l'outcome gagnant, ne paie encore rien.
    resp = client.post(f"/events/{event['id']}/resolve", json={
        "winning_outcome_id": outcome_yes["id"], "evidence_url": "https://example.com/preuve",
    }, headers=admin_headers)
    assert resp.status_code == 200

    event_after_resolve = client.get(f"/events/{event['id']}").json()
    assert event_after_resolve["status"] == "resolved_pending_dispute"

    # Étape 2 : finalize_payout — paie réellement, une fois la fenêtre de dispute "passée"
    # (ici immédiatement, aucun test ne lève de dispute sur cet event).
    finalize_resp = client.post(f"/events/{event['id']}/finalize-payout", headers=admin_headers)
    assert finalize_resp.status_code == 200

    # Seul pari placé : 1000 sur "Oui", personne sur "Non".
    # payout = (1000/1000) * 1000 * (1 - 200/10000) = 980
    # solde final = 9000 (après la mise) + 980 = 9980
    balance = client.get("/auth/get-user", headers=bettor_headers).json()["points_balance"]
    assert balance == 9980, f"Payout attendu : 9980, obtenu : {balance}"


@pytest.mark.order(36)
def test_resolved_event_cannot_be_resolved_again(client, admin_headers):
    event = client.get("/events/").json()[0]
    outcome_yes = next(o for o in event["outcomes"] if o["outcome"] == "Oui")

    resp = client.post(f"/events/{event['id']}/resolve", json={
        "winning_outcome_id": outcome_yes["id"], "evidence_url": "https://example.com/preuve",
    }, headers=admin_headers)
    assert resp.status_code == 400


@pytest.mark.order(37)
def test_bet_history_reflects_placement_and_payout(client, bettor_headers):
    resp = client.get("/transactions/me", headers=bettor_headers)
    assert resp.status_code == 200
    kinds = [tx["kind"] for tx in resp.json()]
    assert "bet_placed" in kinds
    assert "bet_won" in kinds