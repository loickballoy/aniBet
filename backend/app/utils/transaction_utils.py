from app.db import get_supabase
from app.models.transaction import PointTransaction, PointTransactionWithBalance


def get_transactions_by_user(user_id: int) -> list[PointTransactionWithBalance]:
    """
    Fetch all transactions for a user sorted by created_at ASC,
    and compute a running balance_after for each entry (used for graph rendering).
    """
    supabase = next(get_supabase())
    res = (
        supabase.table("point_transactions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )

    transactions = [PointTransaction(**row) for row in res.data]

    result: list[PointTransactionWithBalance] = []
    running_total = 0
    for tx in transactions:
        running_total += tx.amount
        result.append(PointTransactionWithBalance(**tx.model_dump(), balance_after=running_total))

    return result

def get_winrate_by_user(user_id: int):
    supabase = next(get_supabase())
    res = supabase.table("bets").select("status").eq("user_id", user_id).neq("status", "pending").neq("status", "refunded").execute()
    return res.data
