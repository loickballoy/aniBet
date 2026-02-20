from app.db import get_supabase
from app.models.bet import Bet
from app.models.event import Event, EventOutcome

# -- Event helpers --

def get_outcomes_for_event(event_id: int) -> list[EventOutcome]:
    supabase = next(get_supabase())
    res = supabase.table("event_outcomes").select("*").eq("event_id", event_id).execute()
    return [EventOutcome(**row) for row in res.data]

def get_events(status: str | None = None, limit: int = 20, offset: int = 0) -> list[Event]:
    supabase = next(get_supabase())
    query = supabase.table("events").select("*").order("created_at", desc=True).range(offset, offset + limit - 1)
    if status:
        query = query.eq("status", status)
    res = query.execute()
    return [Event(**row) for row in res.data]

def get_event_by_id(event_id: int) -> Event | None:
    supabase = next(get_supabase())
    res = supabase.table("events").select("*").eq("id", event_id).execute()
    return Event(**res.data[0]) if res.data else None

def get_outcome_by_id(outcome_id: int) -> EventOutcome | None:
    supabase = next(get_supabase())
    res = supabase.table("event_outcomes").select("*").eq("id", outcome_id).execute()
    return EventOutcome(**res.data[0]) if res.data else None

# -- Bet helpers --

def get_bets_by_outcome(outcome_id: int) -> list[Bet]:
    supabase = next(get_supabase())
    res = supabase.table("bets").select("*").eq("outcome_id", outcome_id).execute()
    return [Bet(**row) for row in res.data]

# -- Payout logic --

def calculate_payout(points_placed: int, outcome_pool: int, event_pool: int, fee_bps: int) -> float:
    if outcome_pool == 0:
        return 0
    gross_payout = (points_placed / outcome_pool) * event_pool
    net = gross_payout * (1 - fee_bps / 10000)
    return int(net)

# --Event resolution -- 

def resolve_event(event_id: int, winning_outcome_id: int, resolved_by: int, note: str | None = None):
    """
    1. Mark event as resolved
    2. Mark winning outcome
    3. For each winning bet → calculate payout, update bet status, credit user, log transaction
    4. For each losing bet → mark as lost
    5. Insert event_resolution row
    """
    supabase = next(get_supabase())

    event = get_event_by_id(event_id)
    winning_outcome = get_outcome_by_id(winning_outcome_id)
    all_outcomes = get_outcomes_for_event(event_id)

    # 1. Resolve event
    supabase.table("events").update({"status": "resolved"}).eq("id", event_id).execute()

    # 2. Mark winning outcome
    supabase.table("event_outcomes").update({"is_winner": True}).eq("id", winning_outcome_id).execute()

    # 3 & 4. Process bets for each outcome
    for outcome in all_outcomes:
        bets = get_bets_by_outcome(outcome.id)
        for bet in bets:
            if bet.status == "refunded":
                continue
            if outcome.id == winning_outcome_id:
                payout = calculate_payout(
                    bet.points_placed,
                    winning_outcome.pool_points,
                    event.pool_total,
                    event.fee_bps,
                )
                supabase.table("bets").update({"status": "won"}).eq("id", bet.id).execute()
                # Credit payout
                supabase.rpc("add_user_points", {"p_user_id": bet.user_id, "p_amount": payout}).execute()
                supabase.table("point_transactions").insert({
                    "user_id": bet.user_id,
                    "kind": "bet_won",
                    "amount": payout,
                    "reference_type": "bet",
                    "reference_id": bet.id,
                }).execute()
            else:
                supabase.table("bets").update({"status": "lost"}).eq("id", bet.id).execute()

    # 5. Insert resolution record
    supabase.table("event_resolution").insert({
        "event_id": event_id,
        "winning_outcomes_id": winning_outcome_id,
        "resolved_by": resolved_by,
        "note": note,
    }).execute()