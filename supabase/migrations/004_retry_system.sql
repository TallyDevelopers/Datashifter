-- ============================================================
-- Migration 004: Retry System
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add retry settings columns to sync_configs
--    max_retries: how many automatic retry attempts the worker makes per failed record
--    retry_on_partial: whether the worker auto-retries on a partial run (some failed)
--    notify_on_failure: whether to note failure prominently in UI (future email hook)
alter table public.sync_configs
  add column if not exists max_retries int not null default 3,
  add column if not exists retry_on_partial boolean not null default true,
  add column if not exists notify_on_failure boolean not null default true;

-- 2. Add sync_config_id directly on sync_record_errors
--    This lets the retry engine look up the config without joining through sync_logs
alter table public.sync_record_errors
  add column if not exists sync_config_id uuid references public.sync_configs(id) on delete cascade,
  add column if not exists source_org_id uuid references public.connected_orgs(id) on delete set null,
  add column if not exists target_org_id uuid references public.connected_orgs(id) on delete set null,
  add column if not exists direction text not null default 'forward' check (direction in ('forward', 'reverse')),
  add column if not exists retry_status text not null default 'pending' check (retry_status in ('pending', 'retrying', 'resolved', 'abandoned'));

-- 3. Backfill sync_config_id on existing errors (via sync_logs join)
update public.sync_record_errors sre
set sync_config_id = sl.sync_config_id
from public.sync_logs sl
where sre.sync_log_id = sl.id
  and sre.sync_config_id is null;

-- 4. Add status_message column to connected_orgs (needed by worker token refresh error handling)
alter table public.connected_orgs
  add column if not exists status_message text;

-- 5. Useful indexes for retry queries
create index if not exists idx_sync_errors_config on public.sync_record_errors(sync_config_id);
create index if not exists idx_sync_errors_retry_status on public.sync_record_errors(retry_status) where retry_status = 'pending';
create index if not exists idx_sync_errors_unresolved on public.sync_record_errors(sync_config_id, resolved) where resolved = false;
