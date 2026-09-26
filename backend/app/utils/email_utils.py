"""
Envoi d'emails de notification à l'équipe du site (via l'API HTTP de Resend).

Deux garanties :
- Un envoi ne bloque JAMAIS la requête du joueur : il part dans un thread.
- Un échec d'envoi n'est JAMAIS remonté à l'utilisateur : il est journalisé.
Sans RESEND_API_KEY / NOTIFY_EMAIL (dev, tests, CI), rien n'est envoyé.
"""

import logging
import threading

import httpx

from app.setting import settings

logger = logging.getLogger("anibet.email")

RESEND_URL = "https://api.resend.com/emails"


def is_configured() -> bool:
    return bool(settings.resend_api_key and settings.notify_email)


def _send(subject: str, text: str) -> None:
    try:
        resp = httpx.post(
            RESEND_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": settings.email_from, "to": [settings.notify_email], "subject": subject, "text": text},
            timeout=10,
        )
        if resp.status_code >= 300:
            logger.warning("Email not sent (%s): %s", resp.status_code, resp.text[:300])
    except Exception:
        logger.exception("Email sending failed")


def send_team_email(subject: str, text: str) -> None:
    if not is_configured():
        return
    threading.Thread(target=_send, args=(subject, text), daemon=True).start()


def build_notification_email(type_: str, payload: dict) -> tuple[str, str] | None:
    """Sujet + corps lisibles pour chaque type de notification, avec un lien direct."""
    site = (settings.frontend_url or "").rstrip("/")
    if type_ == "proposal_pending":
        return (
            f"[aniBet] New event proposal: {payload.get('title', '')}",
            f"A player proposed a new event:\n\n  {payload.get('title', '')}\n\nReview it: {site}/mod/proposals\n",
        )
    if type_ == "series_proposal_pending":
        return (
            f"[aniBet] New series proposal: {payload.get('name', '')}",
            f"A player proposed a new series:\n\n  {payload.get('name', '')}\n\nReview it (Admin > Series proposals): {site}/admin\n",
        )
    if type_ == "dispute_opened":
        return (
            f"[aniBet] Dispute opened: {payload.get('title', '')}",
            "A player disputed the result of:\n\n"
            f"  {payload.get('title', '')}\n\n"
            f"Their source: {payload.get('counter_evidence_url', '')}\n\n"
            "Payouts are on hold until you decide (Admin > Disputes): "
            f"{site}/admin\n",
        )
    return None
