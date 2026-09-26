"""
Verrouillage / réouverture des events (stratégie anti-leak : un mod verrouille
avant les leaks, rouvre si le chapitre ne tranche pas) et emails d'équipe.
"""
from datetime import datetime, timedelta, UTC

import pytest

from app.utils import email_utils


def _future(hours=24):
    return (datetime.now(UTC) + timedelta(hours=hours)).isoformat()


@pytest.fixture(scope="module")
def lock_series(client, admin_headers, second_bettor_id):
    series = client.post("/series/", json={"name": "Lock Series", "slug": "lock-series"}, headers=admin_headers).json()
    # test_bettor2 devient mod de cette série
    client.post("/admin/mod-scopes", json={"user_id": second_bettor_id, "series_id": series["id"]}, headers=admin_headers)
    return series


def _new_event(client, headers, series_id, title):
    resp = client.post("/events/", json={"title": title, "series_id": series_id, "outcomes": ["Yes", "No"],
                                          "fee_bps": 200, "tag_ids": [], "locks_at": _future()}, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Verrouillage / réouverture ───────────────────────────────────────────────

@pytest.mark.order(110)
def test_mod_can_lock_and_reopen_in_own_series(client, lock_series, second_bettor_headers):
    ev = _new_event(client, second_bettor_headers, lock_series["id"], "Lock me")
    assert client.patch(f"/events/{ev['id']}/lock", headers=second_bettor_headers).status_code == 200
    assert client.get(f"/events/{ev['id']}").json()["status"] == "locked"
    resp = client.patch(f"/events/{ev['id']}/reopen", json={"locks_at": _future(48)}, headers=second_bettor_headers)
    assert resp.status_code == 200
    assert client.get(f"/events/{ev['id']}").json()["status"] == "open"


@pytest.mark.order(111)
def test_regular_user_cannot_lock_or_reopen(client, lock_series, admin_headers, bettor_headers):
    ev = _new_event(client, admin_headers, lock_series["id"], "Not yours")
    assert client.patch(f"/events/{ev['id']}/lock", headers=bettor_headers).status_code == 403
    client.patch(f"/events/{ev['id']}/lock", headers=admin_headers)
    assert client.patch(f"/events/{ev['id']}/reopen", json={"locks_at": _future()}, headers=bettor_headers).status_code == 403


@pytest.mark.order(112)
def test_only_open_events_can_be_locked(client, lock_series, admin_headers):
    ev = _new_event(client, admin_headers, lock_series["id"], "Double lock")
    assert client.patch(f"/events/{ev['id']}/lock", headers=admin_headers).status_code == 200
    assert client.patch(f"/events/{ev['id']}/lock", headers=admin_headers).status_code == 409


@pytest.mark.order(113)
def test_locking_a_resolved_event_is_refused(client, lock_series, admin_headers):
    # Avant le correctif, ceci ramenait l'event résolu à 'locked'.
    ev = _new_event(client, admin_headers, lock_series["id"], "Already resolved")
    client.post(f"/events/{ev['id']}/resolve", json={"winning_outcome_id": ev["outcomes"][0]["id"],
                                                    "evidence_url": "https://proof"}, headers=admin_headers)
    assert client.patch(f"/events/{ev['id']}/lock", headers=admin_headers).status_code == 409
    assert client.get(f"/events/{ev['id']}").json()["status"] == "resolved_pending_dispute"


@pytest.mark.order(114)
def test_reopen_requires_future_deadline_and_locked_status(client, lock_series, admin_headers):
    ev = _new_event(client, admin_headers, lock_series["id"], "Reopen rules")
    past = (datetime.now(UTC) - timedelta(hours=1)).isoformat()
    # pas encore verrouillé
    assert client.patch(f"/events/{ev['id']}/reopen", json={"locks_at": _future()}, headers=admin_headers).status_code == 409
    client.patch(f"/events/{ev['id']}/lock", headers=admin_headers)
    assert client.patch(f"/events/{ev['id']}/reopen", json={"locks_at": past}, headers=admin_headers).status_code == 400


@pytest.mark.order(115)
def test_bets_work_again_after_reopen(client, lock_series, admin_headers, bettor_headers):
    ev = _new_event(client, admin_headers, lock_series["id"], "Bet after reopen")
    outcome = ev["outcomes"][0]["id"]
    client.patch(f"/events/{ev['id']}/lock", headers=admin_headers)
    locked = client.post("/bets/", json={"event_id": ev["id"], "outcome_id": outcome, "points_placed": 10}, headers=bettor_headers)
    assert locked.status_code in (400, 409)  # refusé tant que verrouillé
    client.patch(f"/events/{ev['id']}/reopen", json={"locks_at": _future()}, headers=admin_headers)
    reopened = client.post("/bets/", json={"event_id": ev["id"], "outcome_id": outcome, "points_placed": 10}, headers=bettor_headers)
    assert reopened.status_code == 201, reopened.text


# ── Emails d'équipe ──────────────────────────────────────────────────────────

@pytest.fixture
def captured_emails(monkeypatch):
    """Active l'envoi avec une fausse config et capture les emails sans réseau."""
    sent = []
    monkeypatch.setattr(email_utils.settings, "resend_api_key", "test-key")
    monkeypatch.setattr(email_utils.settings, "notify_email", "team@example.com")
    monkeypatch.setattr(email_utils, "_send", lambda subject, text: sent.append((subject, text)))

    class _SyncThread:  # exécute tout de suite au lieu d'un vrai thread
        def __init__(self, target, args=(), daemon=None):
            self._target, self._args = target, args
        def start(self):
            self._target(*self._args)

    monkeypatch.setattr(email_utils.threading, "Thread", _SyncThread)
    return sent


@pytest.mark.order(116)
def test_dispute_sends_team_email(client, lock_series, admin_headers, bettor_headers, captured_emails):
    ev = _new_event(client, admin_headers, lock_series["id"], "Dispute me")
    client.post(f"/events/{ev['id']}/resolve", json={"winning_outcome_id": ev["outcomes"][0]["id"],
                                                    "evidence_url": "https://proof"}, headers=admin_headers)
    resp = client.post(f"/events/{ev['id']}/dispute", json={"counter_evidence_url": "https://counter"}, headers=bettor_headers)
    assert resp.status_code == 201
    assert any("Dispute opened: Dispute me" in subject and "https://counter" in text for subject, text in captured_emails)


@pytest.mark.order(117)
def test_event_proposal_sends_team_email(client, lock_series, bettor_headers, captured_emails):
    client.post("/events/propose", json={"title": "Will X happen?", "series_id": lock_series["id"],
                                         "outcomes": ["Yes", "No"]}, headers=bettor_headers)
    assert any("New event proposal: Will X happen?" in subject for subject, _ in captured_emails)


def test_no_email_when_not_configured(monkeypatch):
    calls = []
    monkeypatch.setattr(email_utils.settings, "resend_api_key", None)
    monkeypatch.setattr(email_utils, "_send", lambda *a: calls.append(a))
    email_utils.send_team_email("s", "t")
    assert calls == []


def test_email_failure_never_raises(monkeypatch):
    def boom(*a, **k):
        raise ConnectionError("network down")
    monkeypatch.setattr(email_utils.httpx, "post", boom)
    email_utils._send("subject", "text")  # ne doit pas lever d'exception
