-- ============================================================================
-- 012_weekly_attempts_found_categories.sql
-- Colonne manquante dans le schéma initial : il faut tracker quelles
-- catégories ont déjà été trouvées au fil des essais.
-- ============================================================================

alter table weekly_attempts add column if not exists found_categories jsonb not null default '[]';