"""Events : création (admin uniquement), transaction event+outcomes atomique."""
import pytest


@pytest.mark.order(20)
def test_non_admin_cannot_create_event(client, bettor_headers):
    resp = client.post("/events/", json={
        "title": "Luffy bat Kaido ?", "outcomes": ["Oui", "Non"],
    }, headers=bettor_headers)
    assert resp.status_code == 403


@pytest.mark.order(21)
def test_event_needs_at_least_two_outcomes(client, admin_headers):
    resp = client.post("/events/", json={
        "title": "Event à un seul outcome", "outcomes": ["Seul"],
    }, headers=admin_headers)
    assert resp.status_code == 400


@pytest.mark.order(22)
def test_admin_creates_event_with_outcomes(client, admin_headers):
    series_id = client.get("/series/").json()[0]["id"]

    resp = client.post("/events/", json={
        "title": "Luffy bat Kaido ?",
        "series_id": series_id,
        "outcomes": ["Oui", "Non"],
        "fee_bps": 200,
    }, headers=admin_headers)

    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "open"
    assert body["pool_total"] == 0
    # C'est le test qui couvre directement le correctif "create_event
    # atomique" : les 2 outcomes doivent être présents dans LA MÊME réponse,
    # preuve que l'insert event+outcomes s'est fait dans une seule transaction.
    assert len(body["outcomes"]) == 2
    assert {o["outcome"] for o in body["outcomes"]} == {"Oui", "Non"}


@pytest.mark.order(23)
def test_list_events_returns_created_event(client):
    resp = client.get("/events/")
    assert resp.status_code == 200
    titles = [e["title"] for e in resp.json()]
    assert "Luffy bat Kaido ?" in titles


@pytest.mark.order(24)
def test_trending_events_does_not_crash(client):
    # Ce endpoint fait les JOIN + GROUP BY + gestion de tags les plus
    # complexes de toute l'API — le test le plus utile ici est juste
    # "ça ne plante pas et ça renvoie l'event qu'on vient de créer".
    resp = client.get("/events/trending")
    assert resp.status_code == 200
    titles = [e["title"] for e in resp.json()]
    assert "Luffy bat Kaido ?" in titles
