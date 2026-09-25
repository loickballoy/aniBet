from fastapi import APIRouter, HTTPException, status

from app.models.moderation import (
    EventProposal, ProposeEventRequest, ApproveProposalRequest,
    GrantModScopeRequest, Notification,
)
from app.models.event import EventWithOutcomes
from app.utils import auth_utils
from app.utils import moderation_utils

user_dependency = auth_utils.user_dependency

ModerationRouter = APIRouter(tags=["moderation"])


# ---------------------------------------------------------------------------
# Propositions — n'importe quel utilisateur connecté peut proposer
# ---------------------------------------------------------------------------

@ModerationRouter.post("/events/propose", response_model=EventProposal, status_code=status.HTTP_201_CREATED)
async def propose_event(request: ProposeEventRequest, current_user: user_dependency):
    if len(request.outcomes) < 2:
        raise HTTPException(status_code=400, detail="A proposal needs at least 2 outcomes")

    return moderation_utils.propose_event(
        proposed_by=auth_utils.get_user_id(current_user.username),
        title=request.title,
        description=request.description,
        series_id=request.series_id,
        outcomes=request.outcomes,
        source_url=request.source_url,
    )


@ModerationRouter.get("/events/proposals/pending", response_model=list[EventProposal])
async def list_pending_proposals(current_user: user_dependency):
    """Scopé automatiquement aux séries où l'utilisateur est mod — pas de paramètre à passer."""
    return moderation_utils.get_pending_proposals_for_mod(auth_utils.get_user_id(current_user.username))


@ModerationRouter.post("/events/proposals/{proposal_id}/approve", response_model=EventWithOutcomes, status_code=status.HTTP_201_CREATED)
async def approve_proposal(proposal_id: int, request: ApproveProposalRequest, current_user: user_dependency):
    try:
        event, outcomes = moderation_utils.approve_proposal(
            proposal_id, auth_utils.get_user_id(current_user.username),
            request.opens_at, request.locks_at, request.fee_bps, request.cover_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return EventWithOutcomes(**event.model_dump(), outcomes=outcomes)


@ModerationRouter.post("/events/proposals/{proposal_id}/reject", status_code=status.HTTP_200_OK)
async def reject_proposal(proposal_id: int, current_user: user_dependency):
    proposal = moderation_utils.get_proposal_by_id(proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if not moderation_utils.is_mod_for_series(auth_utils.get_user_id(current_user.username), proposal.series_id):
        raise HTTPException(status_code=403, detail="Not a mod for this proposal's series")

    moderation_utils.reject_proposal(proposal_id, auth_utils.get_user_id(current_user.username))
    return {"message": "Proposal rejected"}


# ---------------------------------------------------------------------------
# Gestion des mod scopes — admin uniquement
# ---------------------------------------------------------------------------

@ModerationRouter.get("/admin/users/search")
async def search_users(current_user: user_dependency, q: str = ""):
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")
    if len(q.strip()) < 2:
        return []
    return auth_utils.search_users_by_username(q.strip())

@ModerationRouter.post("/admin/mod-scopes", status_code=status.HTTP_201_CREATED)
async def grant_mod_scope(request: GrantModScopeRequest, current_user: user_dependency):
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")

    return moderation_utils.grant_mod_scope(
        request.user_id, request.series_id, auth_utils.get_user_id(current_user.username),
    )


@ModerationRouter.delete("/admin/mod-scopes/{user_id}/{series_id}", status_code=status.HTTP_200_OK)
async def revoke_mod_scope(user_id: int, series_id: int, current_user: user_dependency):
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")

    moderation_utils.revoke_mod_scope(user_id, series_id)
    return {"message": "Mod scope revoked"}


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

@ModerationRouter.get("/notifications/me", response_model=list[Notification])
async def get_my_notifications(current_user: user_dependency, unread_only: bool = True):
    return moderation_utils.get_notifications_for_user(
        auth_utils.get_user_id(current_user.username), unread_only,
    )


@ModerationRouter.patch("/notifications/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_read(notification_id: int, current_user: user_dependency):
    moderation_utils.mark_notification_read(notification_id)
    return {"message": "Marked as read"}