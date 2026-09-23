-- ============================================================================
-- 010_daily_puzzles_schema.sql
--
-- content = données publiques (affichées au joueur, sans la réponse)
-- answer  = clé de correction, JAMAIS exposée via l'API GET du puzzle
-- ============================================================================

create table if not exists daily_challenges (
    id serial primary key,
    challenge_date date not null unique,
    type text not null check (type in ('trivia', 'silhouette')),
    content jsonb not null,
    answer jsonb not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_daily_challenges_date on daily_challenges(challenge_date);

create table if not exists daily_attempts (
    id serial primary key,
    user_id integer not null references "User"(id),
    challenge_id integer not null references daily_challenges(id),
    guesses jsonb not null default '[]',
    score integer,
    result text check (result in ('solved', 'failed')),
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    unique (user_id, challenge_id)
);

create index if not exists idx_daily_attempts_user on daily_attempts(user_id);

create table if not exists weekly_connections (
    id serial primary key,
    week_of date not null unique,  -- le dimanche de la semaine concernée
    grid jsonb not null,           -- 16 personnages
    categories jsonb not null,     -- 4 catégories + la bonne répartition
    created_at timestamptz not null default now()
);

create table if not exists weekly_attempts (
    id serial primary key,
    user_id integer not null references "User"(id),
    puzzle_id integer not null references weekly_connections(id),
    mistakes integer not null default 0,
    tries_used integer not null default 0,
    ad_extended boolean not null default false,
    solved boolean,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    unique (user_id, puzzle_id)
);

create table if not exists streaks (
    user_id integer primary key references "User"(id),
    current_streak integer not null default 0,
    longest_streak integer not null default 0,
    last_completed_date date
);