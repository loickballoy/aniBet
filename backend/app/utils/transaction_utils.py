from app.db import pool
from app.models.transaction import PointTransaction, PointTransactionWithBalance

def get_transactions_by_user(user_id: int) -> list[PointTransactionWithBalance]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT * FROM point_transactions WHERE user_id = %s ORDER BY created_at ASC',
                (user_id,),
            )
            rows = cur.fetchall()
 
    transactions = [PointTransaction(**row) for row in rows]
 
    result: list[PointTransactionWithBalance] = []
    running_total = 0
    for tx in transactions:
        running_total += tx.amount
        result.append(PointTransactionWithBalance(**tx.model_dump(), balance_after=running_total))
 
    return result
 
 
def get_winrate_by_user(user_id: int) -> list[dict]:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT status FROM bets
                WHERE user_id = %s AND status NOT IN ('pending', 'refunded')
                """,
                (user_id,),
            )
            rows = cur.fetchall()
    return rows