-- ============================================================
-- Match Strategy for existing record deduplication
-- Migration 013
-- ============================================================
-- Stores how OrgSync should handle records that already exist
-- in the target org before OrgSync started managing them.
--
-- Shape: {
--   "type": "none" | "field" | "name",
--   "field": "Email" | "AccountNumber" | etc (only when type=field)
-- }

alter table public.sync_configs
  add column if not exists match_strategy jsonb not null default '{"type":"none"}'::jsonb;

alter table public.cpq_job_objects
  add column if not exists match_strategy jsonb not null default '{"type":"none"}'::jsonb;
