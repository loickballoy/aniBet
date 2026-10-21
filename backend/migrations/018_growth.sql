-- ============================================================================
-- 018_growth.sql
--
-- Leviers de croissance (docs/GROWTH_PLAN.md) :
--   - quête de démarrage : récompenses uniques par compte
--   - créateurs : la cagnotte rémunère celui qui a proposé le pari
--   - follows : classement entre amis
--   - compteur de parties en invité (mesure de la conversion invité → compte)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Quête de démarrage. La clé primaire garantit qu'une récompense n'est
-- versée qu'une fois par compte, même avec deux clics simultanés.
-- ---------------------------------------------------------------------------
create table if not exists quest_claims (
    user_id integer not null references "User"(id),
    quest_key text not null,
    reward integer not null,
    claimed_at timestamptz not null default now(),
    primary key (user_id, quest_key)
);

-- Conditions vérifiées côté Python (dans les tables existantes) ; cette
-- fonction ne fait que l'écriture atomique : claim + crédit + ledger.
create or replace function fn_claim_quest(p_user_id integer, p_quest_key text, p_reward integer)
returns integer as $$
declare
    v_balance integer;
begin
    insert into quest_claims (user_id, quest_key, reward) values (p_user_id, p_quest_key, p_reward);
    -- (unique_violation remonte tel quel : "déjà réclamée")

    update "User" set points_balance = points_balance + p_reward where id = p_user_id
    returning points_balance into v_balance;

    insert into point_transactions (user_id, kind, amount, reference_type)
    values (p_user_id, 'quest_reward', p_reward, p_quest_key);

    return v_balance;
end;
$$ language plpgsql;


-- ---------------------------------------------------------------------------
-- Part créateur : quand un pari issu d'une proposition est payé, son auteur
-- touche 0,5 % de la cagnotte, prélevés sur le fee (déjà retiré des gains
-- des parieurs) — donc jamais plus que le fee : aucun AniCoin créé.
-- Idempotent : un seul versement par event, même si appelée deux fois.
-- ---------------------------------------------------------------------------
create or replace function fn_pay_creator_cut(p_event_id integer, p_cut_bps integer)
returns integer as $$
declare
    v_status text;
    v_pool integer;
    v_fee_bps integer;
    v_proposer integer;
    v_cut integer;
begin
    select e.status, e.pool_total, e.fee_bps, p.proposed_by
    into v_status, v_pool, v_fee_bps, v_proposer
    from events e
    left join event_proposals p on p.id = e.proposal_id
    where e.id = p_event_id;

    if v_status is distinct from 'resolved' or v_proposer is null then
        return 0;
    end if;
    if exists (
        select 1 from point_transactions
        where kind = 'creator_cut' and reference_type = 'event' and reference_id = p_event_id
    ) then
        return 0;
    end if;

    v_cut := floor(coalesce(v_pool, 0) * least(p_cut_bps, coalesce(v_fee_bps, 0)) / 10000.0);
    if v_cut <= 0 then
        return 0;
    end if;

    update "User" set points_balance = points_balance + v_cut where id = v_proposer;
    insert into point_transactions (user_id, kind, amount, reference_type, reference_id)
    values (v_proposer, 'creator_cut', v_cut, 'event', p_event_id);
    return v_cut;
end;
$$ language plpgsql;


-- ---------------------------------------------------------------------------
-- Follows (classement entre amis).
-- ---------------------------------------------------------------------------
create table if not exists follows (
    follower_id integer not null references "User"(id),
    followee_id integer not null references "User"(id),
    created_at timestamptz not null default now(),
    primary key (follower_id, followee_id),
    check (follower_id <> followee_id)
);

create index if not exists idx_follows_followee on follows(followee_id);


-- ---------------------------------------------------------------------------
-- Parties jouées en invité, agrégées par jour (aucune donnée personnelle).
-- ---------------------------------------------------------------------------
create table if not exists guest_play_daily (
    day date not null,
    game text not null,
    plays integer not null default 0,
    primary key (day, game)
);

create index if not exists idx_events_locks_at on events(locks_at) where status = 'open';
