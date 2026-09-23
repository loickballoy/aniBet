"""Séries : CRUD réservé aux admins."""
import pytest


@pytest.mark.order(10)
def test_non_admin_cannot_create_series(client, bettor_headers):
    resp = client.post("/series/", json={"name": "One Piece", "slug": "one-piece"}, headers=bettor_headers)
    assert resp.status_code == 403


@pytest.mark.order(11)
def test_admin_can_create_series(client, admin_headers):
    resp = client.post("/series/", json={"name": "One Piece", "slug": "one-piece"}, headers=admin_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "One Piece"
    assert body["slug"] == "one-piece"


@pytest.mark.order(12)
def test_duplicate_slug_is_rejected(client, admin_headers):
    resp = client.post("/series/", json={"name": "One Piece Again", "slug": "one-piece"}, headers=admin_headers)
    assert resp.status_code == 400


@pytest.mark.order(13)
def test_list_series_includes_created_one(client):
    resp = client.get("/series/")
    assert resp.status_code == 200
    slugs = [s["slug"] for s in resp.json()]
    assert "one-piece" in slugs


@pytest.mark.order(14)
def test_update_series_name(client, admin_headers):
    series = client.get("/series/").json()[0]
    resp = client.patch(f"/series/{series['id']}", json={"name": "One Piece (renamed)"}, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "One Piece (renamed)"
