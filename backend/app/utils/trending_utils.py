from app.db import get_supabase
from app.models.event import Event, EventOutcome, EventWithOutcomes

TRENDING_LIMIT = 5
CAROUSEL_TAG_NAME = "carousel"
ADMIN_CAROUSEL_TAG_NAME = "admin_carousel"


def _get_or_create_tag(supabase, name: str) -> int:
    """Return the id of a tag by name, creating it if it doesn't exist."""
    res = supabase.table("tags").select("id").eq("label", name).execute()
    if res.data:
        return res.data[0]["id"]
    created = supabase.table("tags").insert({"label": name}).execute()
    return created.data[0]["id"]


def get_trending_events() -> list[EventWithOutcomes]:
    """
    1. Admin_carousel events are always included and take priority slots
    2. Fill remaining slots (up to TRENDING_LIMIT) with best scored open events
    3. Reset and reassign 'carousel' tag for non-admin trending events
    4. Return admin_carousel events + trending fill-ins (total capped at TRENDING_LIMIT)
    """
    supabase = next(get_supabase())

    carousel_tag_id = _get_or_create_tag(supabase, CAROUSEL_TAG_NAME)
    admin_carousel_tag_id = _get_or_create_tag(supabase, ADMIN_CAROUSEL_TAG_NAME)

    # --- Fetch admin_carousel event ids ---
    admin_tagged_res = (
        supabase.table("event_tags")
        .select("event_id")
        .eq("tags_id", admin_carousel_tag_id)
        .execute()
    )
    admin_carousel_ids = {row["event_id"] for row in admin_tagged_res.data}

    # --- Fetch open events ---
    events_res = supabase.table("events").select("*").eq("status", "open").execute()
    open_events = [Event(**row) for row in events_res.data]

    # --- Count bets per event (via outcomes) ---
    bets_res = (
        supabase.table("bets")
        .select("outcome_id, event_outcomes(event_id)")
        .execute()
    )
    bet_count_by_event: dict[int, int] = {}
    for row in bets_res.data:
        eo = row.get("event_outcomes")
        if eo:
            eid = eo.get("event_id")
            if eid:
                bet_count_by_event[eid] = bet_count_by_event.get(eid, 0) + 1

    # --- Score and sort open events, excluding admin_carousel ones ---
    def score(event: Event) -> float:
        bets = bet_count_by_event.get(event.id, 0)
        return event.pool_total * 0.6 + bets * 0.4

    non_admin_events = [e for e in open_events if e.id not in admin_carousel_ids]
    sorted_events = sorted(non_admin_events, key=score, reverse=True)

    # Fill remaining slots after admin_carousel
    remaining_slots = max(0, TRENDING_LIMIT - len(admin_carousel_ids))
    trending_events = sorted_events[:remaining_slots]
    trending_ids = {e.id for e in trending_events}

    # --- Reset carousel tags (never touch admin_carousel events) ---
    carousel_tagged_res = (
        supabase.table("event_tags")
        .select("event_id")
        .eq("tags_id", carousel_tag_id)
        .execute()
    )
    for row in carousel_tagged_res.data:
        eid = row["event_id"]
        if eid not in admin_carousel_ids:
            supabase.table("event_tags").delete().eq("event_id", eid).eq("tags_id", carousel_tag_id).execute()

    # --- Tag new trending events ---
    for eid in trending_ids:
        exists = (
            supabase.table("event_tags")
            .select("event_id")
            .eq("event_id", eid)
            .eq("tags_id", carousel_tag_id)
            .execute()
        )
        if not exists.data:
            supabase.table("event_tags").insert({"event_id": eid, "tags_id": carousel_tag_id}).execute()

    # --- Fetch full admin_carousel events (any status) ---
    admin_events: list[Event] = []
    if admin_carousel_ids:
        res = supabase.table("events").select("*").in_("id", list(admin_carousel_ids)).execute()
        admin_events = [Event(**row) for row in res.data]

    # --- Build final list: admin_carousel first, then trending fill-ins ---
    all_events = admin_events + trending_events

    result: list[EventWithOutcomes] = []
    for event in all_events:
        outcomes_res = supabase.table("event_outcomes").select("*").eq("event_id", event.id).execute()
        outcomes = [EventOutcome(**row) for row in outcomes_res.data]
        result.append(EventWithOutcomes(**event.model_dump(), outcomes=outcomes))

    return result


def add_admin_carousel(event_id: int) -> None:
    """Tag an event with admin_carousel."""
    supabase = next(get_supabase())
    admin_carousel_tag_id = _get_or_create_tag(supabase, ADMIN_CAROUSEL_TAG_NAME)
    supabase.table("event_tags").insert({"event_id": event_id, "tags_id": admin_carousel_tag_id}).execute()


def remove_admin_carousel(event_id: int) -> None:
    """Remove the admin_carousel tag from an event."""
    supabase = next(get_supabase())
    admin_carousel_tag_id = _get_or_create_tag(supabase, ADMIN_CAROUSEL_TAG_NAME)
    supabase.table("event_tags").delete().eq("event_id", event_id).eq("tags_id", admin_carousel_tag_id).execute()


def has_admin_carousel_tag(event_id: int) -> bool:
    supabase = next(get_supabase())
    admin_carousel_tag_id = _get_or_create_tag(supabase, ADMIN_CAROUSEL_TAG_NAME)
    res = (
        supabase.table("event_tags")
        .select("event_id")
        .eq("event_id", event_id)
        .eq("tags_id", admin_carousel_tag_id)
        .execute()
    )
    return len(res.data) > 0