"""
Correctifs de la revue de sécurité : chaque test reproduit l'attaque qui
marchait avant le correctif.
"""
import os

import psycopg
import pytest
from psycopg.rows import dict_row


def _db():
    return psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row, autocommit=True)


def _user(username: str) -> dict:
    with _db() as conn:
        return conn.execute('SELECT * FROM "User" WHERE username = %s', (username,)).fetchone()


# ── Inscription ──────────────────────────────────────────────────────────────

@pytest.mark.order(150)
def test_signup_cannot_choose_role_balance_or_ban_status(client):
    resp = client.post("/auth/signup", json={
        "username": "sneaky", "email": "sneaky@test.local", "password": "sneakypass123",
        "role": "admin", "points_balance": 999_999_999, "is_banned": False,
        "google_sub": "someone-elses-google-account",
    })
    assert resp.status_code == 200
    user = _user("sneaky")
    assert user["role"] == "user"
    assert user["points_balance"] == 10000
    assert user["google_sub"] is None


@pytest.mark.order(151)
def test_signup_validates_username_and_password(client):
    base = {"email": "valid@test.local", "password": "longenough1"}
    assert client.post("/auth/signup", json={**base, "username": "<script>"}).status_code == 422
    assert client.post("/auth/signup", json={**base, "username": "ok_name", "password": "short"}).status_code == 422
    assert client.post("/auth/signup", json={**base, "username": "ok_name", "email": "not-an-email"}).status_code == 422


@pytest.mark.order(152)
def test_signup_rejects_taken_username(client):
    resp = client.post("/auth/signup", json={"username": "sneaky", "email": "other@test.local", "password": "sneakypass123"})
    assert resp.status_code == 409


@pytest.mark.order(153)
def test_get_user_never_returns_password_hash(client, bettor_headers):
    body = client.get("/auth/get-user", headers=bettor_headers).json()
    assert "password_hash" not in body
    assert body["username"] == "test_bettor"


# ── Bannissement ─────────────────────────────────────────────────────────────

@pytest.mark.order(154)
def test_banned_user_is_locked_out(client):
    client.post("/auth/signup", json={"username": "to_ban", "email": "ban@test.local", "password": "banpass1234"})
    token = client.post("/auth/token", data={"username": "to_ban", "password": "banpass1234"}).json()["access_token"]
    with _db() as conn:
        conn.execute('UPDATE "User" SET is_banned = true WHERE username = %s', ("to_ban",))

    # Le token déjà émis ne marche plus, et on ne peut pas en obtenir un nouveau.
    assert client.get("/auth/get-user", headers={"Authorization": f"Bearer {token}"}).status_code == 403
    assert client.post("/auth/token", data={"username": "to_ban", "password": "banpass1234"}).status_code == 401


# ── Notifications ────────────────────────────────────────────────────────────

@pytest.mark.order(155)
def test_cannot_mark_someone_elses_notification_read(client, bettor_id, second_bettor_headers):
    with _db() as conn:
        notif_id = conn.execute(
            "INSERT INTO notifications (user_id, type, payload) VALUES (%s, 'test', '{}') RETURNING id",
            (bettor_id,),
        ).fetchone()["id"]

    client.patch(f"/notifications/{notif_id}/read", headers=second_bettor_headers)
    with _db() as conn:
        assert conn.execute("SELECT read_at FROM notifications WHERE id = %s", (notif_id,)).fetchone()["read_at"] is None


# ── Fee des events ───────────────────────────────────────────────────────────

@pytest.mark.order(156)
@pytest.mark.parametrize("fee_bps", [-5000, 10000])
def test_event_fee_must_stay_in_range(client, admin_headers, fee_bps):
    # Fee négatif = payout supérieur à la cagnotte (AniCoins créés de rien).
    resp = client.post("/events/", json={
        "title": "Fee abuse", "outcomes": ["yes", "no"], "fee_bps": fee_bps,
    }, headers=admin_headers)
    assert resp.status_code == 422


# ── Avatar ───────────────────────────────────────────────────────────────────

@pytest.mark.order(157)
def test_avatar_must_be_an_https_image_url(client, bettor_headers):
    resp = client.patch("/auth/change-avatar", json={"pfp_url": "javascript:alert(1)"}, headers=bettor_headers)
    assert resp.status_code == 400


# ── Rattachement OAuth ───────────────────────────────────────────────────────

@pytest.mark.order(158)
def test_oauth_login_takes_over_unverified_password_account(client):
    """Pré-détournement : l'attaquant s'inscrit avec l'email de la victime ; la
    victime arrive ensuite via Discord (email vérifié). Le mot de passe de
    l'attaquant ne doit plus ouvrir le compte."""
    from app.utils import auth_utils
    from app.validators.validators import DiscordUser

    client.post("/auth/signup", json={"username": "squatter", "email": "victim@test.local", "password": "attackerpass1"})
    auth_utils.create_user_from_discord_info(
        DiscordUser(id="999", username="victim", email="victim@test.local", verified=True)
    )
    assert client.post("/auth/token", data={"username": "squatter", "password": "attackerpass1"}).status_code == 401
    assert _user("squatter")["discord_id"] == "999"
