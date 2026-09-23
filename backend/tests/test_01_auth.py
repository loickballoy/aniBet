"""Auth : signup, login, protections de base."""
import pytest


@pytest.mark.order(1)
def test_signup_creates_account(client):
    resp = client.post("/auth/signup", json={
        "username": "alice", "email": "alice@test.local",
        "password_hash": "correcthorsebatterystaple", "role": "user",
    })
    assert resp.status_code == 200
    assert resp.json()["message"] == "User created successfully"


@pytest.mark.order(2)
def test_signup_without_password_is_rejected(client):
    resp = client.post("/auth/signup", json={
        "username": "nopassword", "email": "nopass@test.local",
        "password_hash": "", "role": "user",
    })
    assert resp.status_code == 400
    assert "password" in resp.json()["detail"].lower()


@pytest.mark.order(3)
def test_signup_duplicate_email_is_rejected(client):
    resp = client.post("/auth/signup", json={
        "username": "alice_bis", "email": "alice@test.local",
        "password_hash": "anotherpassword123", "role": "user",
    })
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"].lower()


@pytest.mark.order(4)
def test_login_with_correct_password_succeeds(client):
    resp = client.post("/auth/token", data={"username": "alice", "password": "correcthorsebatterystaple"})
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.order(5)
def test_login_with_wrong_password_fails(client):
    resp = client.post("/auth/token", data={"username": "alice", "password": "wrongpassword"})
    assert resp.status_code == 401


@pytest.mark.order(6)
def test_protected_route_without_token_is_rejected(client):
    resp = client.get("/auth/get-user")
    assert resp.status_code == 401


@pytest.mark.order(7)
def test_protected_route_with_token_returns_current_user(client):
    login = client.post("/auth/token", data={"username": "alice", "password": "correcthorsebatterystaple"})
    token = login.json()["access_token"]

    resp = client.get("/auth/get-user", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201  # status_code déclaré ainsi sur cette route
    assert resp.json()["username"] == "alice"
