"""Bingo : création de carte (transaction card+items), soumission, résolution."""
import pytest
from datetime import datetime, timedelta, UTC


@pytest.mark.order(40)
def test_admin_creates_bingo_card_with_items(client, admin_headers):
    now = datetime.now(UTC)
    resp = client.post("/bingo/", json={
        "title": "Chapitre 1100",
        "opens_at": now.isoformat(),
        "closes_at": (now + timedelta(days=7)).isoformat(),
        "items": ["Un perso meurt", "Un flashback", "Un nouveau perso", "Un combat"],
    }, headers=admin_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "open"


@pytest.mark.order(41)
def test_card_needs_at_least_two_items(client, admin_headers):
    now = datetime.now(UTC)
    resp = client.post("/bingo/", json={
        "title": "Carte invalide",
        "opens_at": now.isoformat(),
        "closes_at": (now + timedelta(days=7)).isoformat(),
        "items": ["Seul item"],
    }, headers=admin_headers)
    assert resp.status_code == 400


@pytest.mark.order(42)
def test_submit_entry_selecting_two_items(client, bettor_headers):
    card = client.get("/bingo/").json()[0]
    items = client.get(f"/bingo/{card['id']}/items").json()
    selected_ids = [items[0]["id"], items[1]["id"]]

    resp = client.post(f"/bingo/{card['id']}/entry", json={
        "selected_item_ids": selected_ids,
    }, headers=bettor_headers)
    assert resp.status_code == 201
    assert resp.json()["selected_item_ids"] == selected_ids


@pytest.mark.order(43)
def test_resubmitting_entry_updates_it(client, bettor_headers):
    card = client.get("/bingo/").json()[0]
    items = client.get(f"/bingo/{card['id']}/items").json()
    new_selection = [items[2]["id"]]

    resp = client.post(f"/bingo/{card['id']}/entry", json={
        "selected_item_ids": new_selection,
    }, headers=bettor_headers)
    assert resp.status_code == 201
    assert resp.json()["selected_item_ids"] == new_selection


@pytest.mark.order(44)
def test_resolve_card_computes_reward(client, admin_headers, bettor_headers):
    card = client.get("/bingo/").json()[0]
    items = client.get(f"/bingo/{card['id']}/items").json()

    # L'entry a été mise à jour au test précédent pour ne contenir que items[2].
    # On résout la carte en disant que CET item est bien arrivé.
    resp = client.post(f"/bingo/{card['id']}/resolve", json={
        "happened_item_ids": [items[2]["id"]],
    }, headers=admin_headers)
    print(resp.json())
    assert resp.status_code == 200

    entry = client.get(f"/bingo/{card['id']}/entry/me", headers=bettor_headers).json()
    assert entry["score"] == 1
    assert entry["coins_earned"] == 500  # REWARD_PER_HIT dans bingo_utils.py
