-- ============================================================================
-- 008_seasons_schema.sql
-- ============================================================================

create table if not exists seasons (
    id serial primary key,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    status text not null default 'upcoming' check (status in ('upcoming', 'active', 'ended'))
);

create table if not exists season_snapshots (
    id serial primary key,
    season_id integer not null references seasons(id),
    user_id integer not null references "User"(id),
    net_gain integer not null,
    final_rank integer,
    tier text,
    created_at timestamptz not null default now(),
    unique (season_id, user_id)
);

create index if not exists idx_season_snapshots_season on season_snapshots(season_id);