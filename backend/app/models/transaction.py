from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PointTransaction(BaseModel):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    user_id: int
    kind: str  # "bet_placed" | "bet_won" | "bingo_reward" | ...
    amount: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None


class PointTransactionWithBalance(PointTransaction):
    balance_after: int  # running cumulative sum — used for the graph
