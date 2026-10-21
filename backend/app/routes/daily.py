from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException, status

from app.models.daily import (
    DailyChallenge, CreateDailyChallengeRequest,
    TriviaSubmitRequest, SilhouetteGuessRequest, SilhouetteGuestGuessRequest, Streak,
)
from app.utils import auth_utils
from app.utils import daily_utils
from app.utils import trivia_scheduler
from app.utils import growth_utils
from app.utils.rate_limit import guest_trivia_limiter, guest_silhouette_limiter

user_dependency = auth_utils.user_dependency
optional_user_dependency = auth_utils.optional_user_dependency

DailyRouter = APIRouter(tags=["daily"])


@DailyRouter.get("/daily-challenges/today")
async def get_todays_challenge(current_user: optional_user_dependency):
    today = date_type.today()
    challenge = daily_utils.get_challenge_for_date(today)
    if not challenge:
        raise HTTPException(status_code=404, detail="No challenge scheduled for today")

    if current_user is None:  # invité : sa progression vit dans son navigateur
        return {"challenge": challenge, "attempt": None, "revealed_answer": None}

    user_id = auth_utils.get_user_id(current_user.username)
    attempt = daily_utils.get_existing_attempt(user_id, challenge.id)

    # La réponse n'est révélée que si le joueur a déjà terminé sa tentative
    # (solved ou failed) — jamais tant que result est encore null.
    revealed_answer = None
    if attempt and attempt.get("result") is not None:
        revealed_answer = daily_utils._get_answer_for_challenge(challenge.id)

    return {
        "challenge": challenge,
        "attempt": attempt,  # None si jamais tenté, sinon l'état actuel (utile pour la silhouette en cours)
        "revealed_answer": revealed_answer,
    }


@DailyRouter.post("/daily-challenges/today/trivia", status_code=status.HTTP_200_OK)
async def submit_trivia(request: TriviaSubmitRequest, current_user: user_dependency):
    today = date_type.today()
    challenge = daily_utils.get_challenge_for_date(today)
    if not challenge or challenge.type != "trivia":
        raise HTTPException(status_code=400, detail="No trivia challenge today")

    user_id = auth_utils.get_user_id(current_user.username)
    if daily_utils.get_existing_attempt(user_id, challenge.id):
        raise HTTPException(status_code=409, detail="Already attempted today's trivia")

    try:
        return daily_utils.submit_trivia(user_id, challenge.id, today, request.answers)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@DailyRouter.post("/daily-challenges/today/silhouette/guess", status_code=status.HTTP_200_OK)
async def guess_silhouette(request: SilhouetteGuessRequest, current_user: user_dependency):
    today = date_type.today()
    challenge = daily_utils.get_challenge_for_date(today)
    if not challenge or challenge.type != "silhouette":
        raise HTTPException(status_code=400, detail="No silhouette challenge today")

    user_id = auth_utils.get_user_id(current_user.username)

    try:
        return daily_utils.submit_silhouette_guess(user_id, challenge.id, today, request.guess)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@DailyRouter.post("/admin/daily-challenges", response_model=DailyChallenge, status_code=status.HTTP_201_CREATED)
async def create_daily_challenge(request: CreateDailyChallengeRequest, current_user: user_dependency):
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")
    if request.type not in ("trivia", "silhouette"):
        raise HTTPException(status_code=400, detail="type must be 'trivia' or 'silhouette'")

    try:
        return daily_utils.create_challenge(request.challenge_date, request.type, request.content, request.answer)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@DailyRouter.post("/admin/daily-challenges/auto-schedule", status_code=status.HTTP_200_OK)
async def auto_schedule_trivia(current_user: user_dependency, days: int = 28):
    """Génère dès maintenant les trivias lun/mer/ven/dim des `days` prochains
    jours (sinon elles sont générées le jour même), pour les relire dans le
    panel admin. Les dates déjà occupées ne sont jamais écrasées."""
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")
    if not 1 <= days <= 90:
        raise HTTPException(status_code=400, detail="days must be between 1 and 90")
    created = trivia_scheduler.schedule_upcoming(date_type.today(), days)
    return {"created": [d.isoformat() for d in created], "bank_size": len(trivia_scheduler.load_bank())}


@DailyRouter.get("/streaks/me", response_model=Streak)
async def get_my_streak(current_user: user_dependency):
    return daily_utils.get_streak(auth_utils.get_user_id(current_user.username))

@DailyRouter.get("/admin/daily-challenges")
async def list_daily_challenges(current_user: user_dependency):
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")
    return daily_utils.list_all_challenges()


@DailyRouter.delete("/admin/daily-challenges/{challenge_id}", status_code=status.HTTP_200_OK)
async def delete_daily_challenge(challenge_id: int, current_user: user_dependency):
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")
    try:
        daily_utils.delete_challenge(challenge_id)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"message": "Deleted"}


# ---------------------------------------------------------------------------
# Jeu en invité : même partie, rien n'est enregistré, aucune récompense.
#
# Jamais la clé de correction : un joueur connecté pourrait jouer en invité,
# lire les bonnes réponses puis les soumettre avec son compte pour gagner
# les AniCoins et le streak. L'invité voit ses bonnes/mauvaises réponses,
# pas les solutions — créer un compte les débloque.
# ---------------------------------------------------------------------------

@DailyRouter.post("/daily-challenges/today/trivia/guest", status_code=status.HTTP_200_OK,
                  dependencies=[Depends(guest_trivia_limiter)])
async def submit_trivia_guest(request: TriviaSubmitRequest):
    challenge = daily_utils.get_challenge_for_date(date_type.today())
    if not challenge or challenge.type != "trivia":
        raise HTTPException(status_code=400, detail="No trivia challenge today")
    try:
        graded = daily_utils.grade_trivia(challenge, request.answers)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    growth_utils.record_guest_play("trivia")  # mesure de la conversion invité → compte
    return {
        "result": "solved" if graded["solved"] else "failed",
        "score": graded["score"],
        "correct_count": graded["correct_count"],
        "correct": graded["correct"],
    }


@DailyRouter.post("/daily-challenges/today/silhouette/guest", status_code=status.HTTP_200_OK,
                  dependencies=[Depends(guest_silhouette_limiter)])
async def guess_silhouette_guest(request: SilhouetteGuestGuessRequest):
    challenge = daily_utils.get_challenge_for_date(date_type.today())
    if not challenge or challenge.type != "silhouette":
        raise HTTPException(status_code=400, detail="No silhouette challenge today")
    correct, answer = daily_utils.check_silhouette_guess(challenge.id, request.guess)
    if correct or request.final:  # partie terminée
        growth_utils.record_guest_play("silhouette")
    # La réponse n'est renvoyée que si l'invité l'a trouvée lui-même.
    return {"guess_correct": correct, "answer": answer if correct else None}
