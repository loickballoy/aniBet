-- ============================================================================
-- 014_proposal_source_url_optional.sql
--
-- Le lien de preuve accélère l'approbation d'une proposition mais ne doit
-- pas être obligatoire — un mod qui suit la série peut vérifier sans lien.
-- Reste distinct de evidence_url sur la RÉSOLUTION (fn_mark_resolution),
-- qui lui reste obligatoire — deux étapes différentes, deux exigences
-- différentes.
-- ============================================================================

alter table event_proposals alter column source_url drop not null;