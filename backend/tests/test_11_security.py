"""
Sécurité de l'authentification : types de tokens, rotation, compatibilité des
anciens hashs de mots de passe, tokens OAuth hors de l'URL, rate limiting.
"""
import pytest
from jose import jwt

from app.setting import settings
from app.utils import auth_utils
from app.utils.rate_limit import RateLimiter

# Hash de "pass123" généré par passlib avant la migration vers bcrypt direct.
LEGACY_PASSLIB_HASH = "$2b$12$.3NONaqGyc50DblY8e0W8uuH0v.8pLb63ddXnZmlOgXttkUozAE9e"


def _login(client, username="test_bettor", password="bettorpass123"):
    resp = client.post("/auth/token", data={"username": username, "password": password})
    assert resp.status_code == 200
    return resp.json()


# ── Types de tokens ──────────────────────────────────────────────────────────

@pytest.mark.order(100)
def test_tokens_carry_their_type(client, bettor_headers):
    tokens = _login(client)
    access = jwt.decode(tokens["access_token"], settings.secret_key, algorithms=["HS256"])
    refresh = jwt.decode(tokens["refresh_token"], settings.secret_key, algorithms=["HS256"])
    assert access["type"] == "access"
    assert refresh["type"] == "refresh"


@pytest.mark.order(101)
def test_refresh_token_cannot_be_used_as_access_token(client, bettor_headers):
    tokens = _login(client)
    resp = client.get("/auth/get-user", headers={"Authorization": f"Bearer {tokens['refresh_token']}"})
    assert resp.status_code == 401


@pytest.mark.order(102)
def test_access_token_cannot_be_used_to_refresh(client, bettor_headers):
    tokens = _login(client)
    resp = client.post("/auth/refresh", json={"refresh_token": tokens["access_token"]})
    assert resp.status_code == 401


@pytest.mark.order(103)
def test_refresh_rotates_and_new_tokens_work(client, bettor_headers):
    tokens = _login(client)
    resp = client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert resp.status_code == 200
    new = resp.json()
    assert client.get("/auth/get-user", headers={"Authorization": f"Bearer {new['access_token']}"}).status_code == 200
    assert client.post("/auth/refresh", json={"refresh_token": new["refresh_token"]}).status_code == 200


@pytest.mark.order(104)
def test_tampered_refresh_token_is_rejected(client, bettor_headers):
    forged = jwt.encode({"sub": "x", "id": 1, "type": "refresh"}, "not-the-real-secret", algorithm="HS256")
    assert client.post("/auth/refresh", json={"refresh_token": forged}).status_code == 401


# ── Mots de passe ────────────────────────────────────────────────────────────

def test_legacy_passlib_hash_still_verifies():
    assert auth_utils.verify_password("pass123", LEGACY_PASSLIB_HASH)
    assert not auth_utils.verify_password("wrong", LEGACY_PASSLIB_HASH)


def test_password_hash_roundtrip_and_oauth_accounts():
    h = auth_utils.get_password_hash("s3cret!")
    assert h.startswith("$2b$") and auth_utils.verify_password("s3cret!", h)
    assert not auth_utils.verify_password("anything", None)  # compte OAuth sans mot de passe


def test_long_passwords_behave_like_passlib():
    # bcrypt ne lit que 72 octets : un mot de passe plus long ne doit pas planter.
    long_pw = "a" * 100
    assert auth_utils.verify_password(long_pw, auth_utils.get_password_hash(long_pw))


# ── OAuth : tokens dans le fragment, pas dans la query ───────────────────────

@pytest.mark.order(105)
def test_oauth_redirect_puts_tokens_in_fragment(client, bettor_headers):
    from app.routes.auth import _issue_tokens_and_redirect

    class _User:
        username = "test_bettor"

    location = _issue_tokens_and_redirect(_User()).headers["location"]
    assert "/auth#access_token=" in location
    assert "?access_token=" not in location


# ── Rate limiting ────────────────────────────────────────────────────────────

def test_rate_limiter_blocks_after_limit():
    limiter = RateLimiter(max_requests=3, window_seconds=60)
    for _ in range(3):
        limiter.check("1.2.3.4")
    with pytest.raises(Exception) as exc:
        limiter.check("1.2.3.4")
    assert exc.value.status_code == 429
    assert "Retry-After" in exc.value.headers


def test_rate_limiter_is_per_ip():
    limiter = RateLimiter(max_requests=1, window_seconds=60)
    limiter.check("1.1.1.1")
    limiter.check("2.2.2.2")  # une autre IP n'est pas affectée


def test_rate_limiter_window_expires(monkeypatch):
    import app.utils.rate_limit as rl
    now = [1000.0]
    monkeypatch.setattr(rl.time, "monotonic", lambda: now[0])
    limiter = RateLimiter(max_requests=1, window_seconds=10)
    limiter.check("9.9.9.9")
    now[0] += 11
    limiter.check("9.9.9.9")  # la fenêtre est passée : de nouveau autorisé


def test_rate_limit_uses_cloudflare_client_ip(monkeypatch, client):
    from app.utils import rate_limit
    monkeypatch.setenv("DISABLE_RATE_LIMIT", "0")
    monkeypatch.setattr(rate_limit, "login_limiter", rate_limit.login_limiter)
    rate_limit.login_limiter._hits.clear()
    try:
        headers = {"CF-Connecting-IP": "203.0.113.7"}
        codes = [client.post("/auth/token", data={"username": "nobody", "password": "x"}, headers=headers).status_code
                 for _ in range(rate_limit.login_limiter.max_requests + 1)]
        assert codes[:-1] == [401] * rate_limit.login_limiter.max_requests
        assert codes[-1] == 429
        # une autre vraie IP derrière Cloudflare n'est pas bloquée
        other = client.post("/auth/token", data={"username": "nobody", "password": "x"},
                            headers={"CF-Connecting-IP": "198.51.100.9"})
        assert other.status_code == 401
    finally:
        rate_limit.login_limiter._hits.clear()
