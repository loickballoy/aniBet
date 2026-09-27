from fastapi import APIRouter, HTTPException, status

from app.models.weekly import WeeklyConnections, CreateWeeklyConnectionsRequest, WeeklyGuessRequest
from app.utils import auth_utils
from app.utils import weekly_utils

user_dependency = auth_utils.user_dependency
optional_user_dependency = auth_utils.optional_user_dependency

WeeklyRouter = APIRouter(tags=["weekly"])


@WeeklyRouter.get("/weekly-connections/current")
async def get_current_puzzle(current_user: optional_user_dependency):
    week_of = weekly_utils.get_current_week_start()
    puzzle = weekly_utils.get_puzzle_for_week(week_of)
    if not puzzle:
        raise HTTPException(status_code=404, detail="No AniConnections puzzle scheduled for this week")

    if current_user is None:  # invité : sa progression vit dans son navigateur
        return {"puzzle": puzzle, "attempt": None, "revealed_categories": None, "found_groups": []}

    user_id = auth_utils.get_user_id(current_user.username)
    attempt = weekly_utils.get_existing_attempt(user_id, puzzle.id)

    revealed_categories = None
    if attempt and attempt.get("solved") is not None:
        revealed_categories = weekly_utils._get_categories_for_puzzle(puzzle.id)

    # Groupes déjà trouvés : sans eux, la page ne peut pas retirer leurs
    # personnages de la grille ni afficher leurs noms pendant la partie.
    found = weekly_utils.found_groups(puzzle.id, attempt["found_categories"]) if attempt else []

    return {"puzzle": puzzle, "attempt": attempt, "revealed_categories": revealed_categories, "found_groups": found}


@WeeklyRouter.post("/weekly-connections/current/guess", status_code=status.HTTP_200_OK)
async def submit_guess(request: WeeklyGuessRequest, current_user: user_dependency):
    week_of = weekly_utils.get_current_week_start()
    puzzle = weekly_utils.get_puzzle_for_week(week_of)
    if not puzzle:
        raise HTTPException(status_code=404, detail="No AniConnections puzzle scheduled for this week")

    user_id = auth_utils.get_user_id(current_user.username)

    try:
        return weekly_utils.submit_guess(user_id, puzzle.id, week_of, request.character_ids)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@WeeklyRouter.post("/admin/weekly-connections", response_model=WeeklyConnections, status_code=status.HTTP_201_CREATED)
async def create_weekly_puzzle(request: CreateWeeklyConnectionsRequest, current_user: user_dependency):
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")
    if request.week_of.weekday() != 6:
        raise HTTPException(status_code=400, detail="week_of must be a Sunday")
    if len(request.grid) != 16:
        raise HTTPException(status_code=400, detail="Grid must contain exactly 16 characters")
    if len(request.categories) != 4:
        raise HTTPException(status_code=400, detail="There must be exactly 4 categories")

    return weekly_utils.create_puzzle(request.week_of, request.grid, request.categories)

@WeeklyRouter.get("/admin/weekly-connections")
async def list_weekly_puzzles(current_user: user_dependency):
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")
    return weekly_utils.list_all_puzzles()


@WeeklyRouter.delete("/admin/weekly-connections/{puzzle_id}", status_code=status.HTTP_200_OK)
async def delete_weekly_puzzle(puzzle_id: int, current_user: user_dependency):
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin only")
    try:
        weekly_utils.delete_puzzle(puzzle_id)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"message": "Deleted"}


# ---------------------------------------------------------------------------
# Jeu en invité : même partie, rien n'est enregistré, aucune récompense.
# ---------------------------------------------------------------------------

@WeeklyRouter.post("/weekly-connections/current/guest-guess", status_code=status.HTTP_200_OK)
async def submit_guess_guest(request: WeeklyGuessRequest):
    puzzle = weekly_utils.get_puzzle_for_week(weekly_utils.get_current_week_start())
    if not puzzle:
        raise HTTPException(status_code=404, detail="No AniConnections puzzle scheduled for this week")
    try:
        label = weekly_utils.match_guess(puzzle.id, request.character_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"guess_correct": label is not None, "matched_category": label}


@WeeklyRouter.get("/weekly-connections/current/guest-reveal")
async def reveal_guest():
    """Toutes les catégories, appelé par le navigateur de l'invité à la fin de
    sa partie. Pas de contrôle possible côté serveur (rien n'est enregistré) :
    accepté, un invité ne gagne rien."""
    puzzle = weekly_utils.get_puzzle_for_week(weekly_utils.get_current_week_start())
    if not puzzle:
        raise HTTPException(status_code=404, detail="No AniConnections puzzle scheduled for this week")
    return weekly_utils._get_categories_for_puzzle(puzzle.id)
