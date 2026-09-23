-- ============================================================================
-- 009_fn_end_season.sql
--
-- Le tier n'est PAS calculé ici : la logique des paliers (TIERS) vit déjà
-- côté Python (rank_utils.get_tier), pas question de la dupliquer en SQL.
-- Cette fonction insère net_gain + final_rank ; le tier est rempli par un
-- second appel Python juste après (season_utils.end_season).
-- ============================================================================

create or replace function fn_end_season(p_season_id integer)
returns void as $$
declare
    v_status text;
    v_starts_at timestamptz;
    v_ends_at timestamptz;
begin
    select status, starts_at, ends_at into v_status, v_starts_at, v_ends_at
    from seasons where id = p_season_id for update;

    if v_status is null then
        raise exception 'Season not found';
    end if;
    if v_status = 'ended' then
        raise exception 'Season already ended';
    end if;

    insert into season_snapshots (season_id, user_id, net_gain, final_rank)
    select
        p_season_id,
        pt.user_id,
        sum(pt.amount)::integer as net_gain,
        rank() over (order by sum(pt.amount) desc)::integer as final_rank
    from point_transactions pt
    join "User" u on u.id = pt.user_id
    where pt.created_at >= v_starts_at and pt.created_at <= v_ends_at
      and u.role not in ('admin', 'owner')
    group by pt.user_id
    on conflict (season_id, user_id) do update
        set net_gain = excluded.net_gain, final_rank = excluded.final_rank;

    update seasons set status = 'ended' where id = p_season_id;
end;
$$ language plpgsql;