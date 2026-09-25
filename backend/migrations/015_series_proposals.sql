create table if not exists series_proposals (
    id serial primary key,
    proposed_by integer not null references "User"(id),
    name text not null,
    description text,
    source_url text,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    reviewed_by integer references "User"(id),
    reviewed_at timestamptz,
    created_series_id integer references series(id),
    created_at timestamptz not null default now()
);

create index if not exists idx_series_proposals_status on series_proposals(status);