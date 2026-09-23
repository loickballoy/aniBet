-- ============================================================================
-- 003_moderation_schema.sql
-- Étape 3 du CDC : système communautaire + modération scopée + dispute.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Rôle "owner" — reçoit systématiquement une notification sur toute
-- proposition/dispute, indépendamment de l'existence d'un mod scopé
-- (CDC §4.1). Pas de flux d'inscription pour ce rôle, exprès : tu le
-- t'attribues toi-même une fois, à la main (voir instructions en bas de
-- ce fichier).
-- ---------------------------------------------------------------------------

alter table "User" drop constraint "User_role_check";
alter table "User" add constraint "User_role_check"
    check (role in ('user', 'admin', 'owner'));

-- ---------------------------------------------------------------------------
-- Mods scopés par série — un mod n'a de pouvoir que sur les séries où on
-- le lui a explicitement accordé, jamais site-wide.
-- ---------------------------------------------------------------------------

create table if not exists mod_scopes (
    id serial primary key,
    user_id integer not null references "User"(id),
    series_id integer not null references series(id),
    granted_at timestamptz not null default now(),
    granted_by integer references "User"(id),
    active boolean not null default true,
    unique (user_id, series_id)
);

create index if not exists idx_mod_scopes_user on mod_scopes(user_id) where active;
create index if not exists idx_mod_scopes_series on mod_scopes(series_id) where active;

-- ---------------------------------------------------------------------------
-- Propositions communautaires — n'importe quel utilisateur peut proposer,
-- un mod scopé approuve/rejette. C'est ce qui remplace "je crée chaque
-- event moi-même".
-- ---------------------------------------------------------------------------

create table if not exists event_proposals (
    id serial primary key,
    proposed_by integer not null references "User"(id),
    title text not null,
    description text,
    series_id integer not null references series(id),
    outcomes text[] not null,
    source_url text not null,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    reviewed_by integer references "User"(id),
    reviewed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_proposals_status on event_proposals(status);
create index if not exists idx_proposals_series on event_proposals(series_id);

-- ---------------------------------------------------------------------------
-- Étendre events : deux nouveaux états pour le cycle resolve -> dispute
-- window -> payout, et un lien optionnel vers la proposition d'origine.
-- ---------------------------------------------------------------------------

alter table events drop constraint events_status_check;
alter table events add constraint events_status_check
    check (status in ('open', 'locked', 'resolved_pending_dispute', 'disputed', 'resolved', 'cancelled'));

alter table events add column if not exists proposal_id integer references event_proposals(id);

-- ---------------------------------------------------------------------------
-- Trace publique de chaque résolution — nécessaire pour que les disputes
-- aient quelque chose de concret à contester (le lien de preuve).
-- ---------------------------------------------------------------------------

create table if not exists event_resolution_log (
    id serial primary key,
    event_id integer not null references events(id),
    resolved_by integer not null references "User"(id),
    winning_outcome_id integer not null references event_outcomes(id),
    evidence_url text not null,
    resolved_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Disputes — bloque le paiement final tant qu'un litige est ouvert.
-- ---------------------------------------------------------------------------

create table if not exists resolution_disputes (
    id serial primary key,
    event_id integer not null references events(id),
    raised_by integer not null references "User"(id),
    counter_evidence_url text not null,
    status text not null default 'open' check (status in ('open', 'upheld_original', 'overturned')),
    escalated_to integer references "User"(id),
    resolved_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_disputes_event on resolution_disputes(event_id);
create index if not exists idx_disputes_status on resolution_disputes(status);

-- ---------------------------------------------------------------------------
-- Notifications — le owner est toujours notifié sur toute proposition,
-- indépendamment de l'existence d'un mod scopé (voir CDC §4.1).
-- ---------------------------------------------------------------------------

create table if not exists notifications (
    id serial primary key,
    user_id integer not null references "User"(id),
    type text not null,
    payload jsonb not null default '{}',
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on notifications(user_id) where read_at is null;

-- ============================================================================
-- Après avoir lancé cette migration, promeus ton propre compte en 'owner' :
--   UPDATE "User" SET role = 'owner' WHERE email = 'ton-email@example.com';
-- Un seul owner suffit en général — les admins existants gardent tous leurs
-- droits actuels, 'owner' n'ajoute qu'une notification systématique en plus.
-- ============================================================================