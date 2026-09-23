-- ============================================================================
-- aniBet — Schéma PostgreSQL (remplace le projet Supabase perdu)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- USER (nom entre guillemets pour matcher le code existant : "User")
-- ---------------------------------------------------------------------------

create table if not exists "User" (
    id serial primary key,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    username text not null unique,
    google_sub text unique,
    discord_id text unique,
    email text not null unique,
    role text not null default 'user' check (role in ('user', 'admin')),
    is_banned boolean not null default false,
    points_balance integer not null default 10000,
    pfp_url text,
    password_hash text  -- null pour les comptes créés via Google/Discord uniquement
);

create index if not exists idx_user_google_sub on "User"(google_sub) where google_sub is not null;
create index if not exists idx_user_discord_id on "User"(discord_id) where discord_id is not null;

-- ---------------------------------------------------------------------------
-- SERIES
-- ---------------------------------------------------------------------------

create table if not exists series (
    id serial primary key,
    created_at timestamptz not null default now(),
    name text not null,
    slug text not null unique,
    cover_url text
);

-- ---------------------------------------------------------------------------
-- EVENTS + OUTCOMES
-- ---------------------------------------------------------------------------

create table if not exists events (
    id serial primary key,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    title text not null,
    description text,
    series_id integer references series(id),
    status text not null default 'open' check (status in ('open', 'locked', 'resolved', 'cancelled')),
    opens_at timestamptz,
    locks_at timestamptz,
    resolved_at timestamptz,
    pool_total integer not null default 0,
    fee_bps integer not null default 200,  -- 200 = 2%, cf calculate_payout
    cover_url text,
    created_by integer references "User"(id)
);

create index if not exists idx_events_status on events(status);
create index if not exists idx_events_series on events(series_id);

create table if not exists event_outcomes (
    id serial primary key,
    created_at timestamptz not null default now(),
    event_id integer not null references events(id),
    outcome text not null,
    pool_points integer not null default 0,
    is_winner boolean not null default false
);

create index if not exists idx_outcomes_event on event_outcomes(event_id);

create table if not exists event_resolution (
    id serial primary key,
    created_at timestamptz not null default now(),
    event_id integer not null references events(id),
    winning_outcomes_id integer not null references event_outcomes(id),
    resolved_by integer references "User"(id),
    note text
);

-- ---------------------------------------------------------------------------
-- TAGS (carousel / admin_carousel, utilisés par trending_utils.py)
-- ---------------------------------------------------------------------------

create table if not exists tags (
    id serial primary key,
    label text not null unique
);

create table if not exists event_tags (
    event_id integer not null references events(id),
    tags_id integer not null references tags(id),
    primary key (event_id, tags_id)
);

-- ---------------------------------------------------------------------------
-- BETS
-- ---------------------------------------------------------------------------

create table if not exists bets (
    id serial primary key,
    created_at timestamptz not null default now(),
    user_id integer not null references "User"(id),
    outcome_id integer not null references event_outcomes(id),
    status text not null default 'pending' check (status in ('pending', 'won', 'lost', 'refunded')),
    points_placed integer not null check (points_placed > 0)
);

create index if not exists idx_bets_user on bets(user_id);
create index if not exists idx_bets_outcome on bets(outcome_id);

-- ---------------------------------------------------------------------------
-- POINT TRANSACTIONS (ledger déjà présent dans le modèle Pydantic)
-- ---------------------------------------------------------------------------

create table if not exists point_transactions (
    id serial primary key,
    created_at timestamptz not null default now(),
    user_id integer not null references "User"(id),
    kind text not null,  -- 'bet_placed' | 'bet_won' | 'bingo_reward' | ...
    amount integer not null,
    reference_type text,
    reference_id integer
);

create index if not exists idx_point_tx_user on point_transactions(user_id, created_at);

-- ---------------------------------------------------------------------------
-- BINGO
-- ---------------------------------------------------------------------------

create table if not exists bingo_cards (
    id serial primary key,
    created_at timestamptz not null default now(),
    title text not null,
    series_id integer references series(id),
    chapter_number integer,
    opens_at timestamptz not null,
    closes_at timestamptz not null,
    status text not null default 'open' check (status in ('open', 'resolved')),
    cover_url text,
    created_by integer references "User"(id)
);

create table if not exists bingo_items (
    id serial primary key,
    created_at timestamptz not null default now(),
    card_id integer not null references bingo_cards(id),
    description text not null,
    did_happen boolean
);

create index if not exists idx_bingo_items_card on bingo_items(card_id);

create table if not exists bingo_entries (
    id serial primary key,
    created_at timestamptz not null default now(),
    user_id integer not null references "User"(id),
    card_id integer not null references bingo_cards(id),
    selected_item_ids integer[] not null default '{}',
    score integer,
    coins_earned integer,
    unique (user_id, card_id)  -- upsert_entry() suppose un seul entry par user/card
);

create index if not exists idx_bingo_entries_card on bingo_entries(card_id);