from fastapi import APIRouter

from app.models.transaction import PointTransactionWithBalance
from app.utils.auth_utils import user_dependency
from app.utils import transaction_utils, auth_utils

TransactionRouter = APIRouter(
    prefix="/transactions",
    tags=["transactions"]
)


@TransactionRouter.get("/me", response_model=list[PointTransactionWithBalance])
async def get_my_transactions(current_user: user_dependency):
    """
    Returns the full transaction history of the connected user,
    sorted by date ASC with a cumulative balance_after field for graph rendering.
    """
    return transaction_utils.get_transactions_by_user(
        auth_utils.get_user_id(current_user.username)
    )

@TransactionRouter .get("/winrate")
async def get_winrate(current_user: user_dependency):

    user_id = auth_utils.get_user_id(current_user.username)

    bets = transaction_utils.get_winrate_by_user(user_id)
    total = len(bets)

    if total == 0:
        return {"won": 0, "lost": 0, "total": 0, "winrate": None}

    won = sum(1 for b in bets if b["status"] == "won")
    lost = sum(1 for b in bets if b["status"] == "lost")

    return {
        "won": won,
        "lost": lost,
        "total": total,
        "winrate": round((won / total) * 100, 1)
    }
