-- ============================================================
-- Catch-up Migration: 004 (Retry System) + 005 (Log Retention)
-- Safe to run even if some columns already exist (all use IF NOT EXISTS)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 004: Retry System
-- ============================================================

-- Retry settings on sync_configs
alter table public.sync_configs
  add column if not exists max_retries int not null default 3,
  add column if not exists retry_on_partial boolean not null default true,
  add column if not exists notify_on_failure boolean not null default true;

-- Owner config on sync_configs (added alongside retry settings)
alter table public.sync_configs
  add column if not exists owner_config jsonb;

-- Extra columns on sync_record_errors for the retry engine
alter table public.sync_record_errors
  add column if not exists sync_config_id uuid references public.sync_configs(id) on delete cascade,
  add column if not exists source_org_id uuid references public.connected_orgs(id) on delete set null,
  add column if not exists target_org_id uuid references public.connected_orgs(id) on delete set null,
  add column if not exists direction text not null default 'forward' check (direction in ('forward', 'reverse')),
  add column if not exists retry_status text not null default 'pending' check (retry_status in ('pending', 'retrying', 'resolved', 'abandoned'));

-- Backfill sync_config_id on existing errors (via sync_logs join)
update public.sync_record_errors sre
set sync_config_id = sl.sync_config_id
from public.sync_logs sl
where sre.sync_log_id = sl.id
  and sre.sync_config_id is null;

-- status_message on connected_orgs (worker token-refresh error handling)
alter table public.connected_orgs
  add column if not exists status_message text;

-- Indexes for retry queries
create index if not exists idx_sync_errors_config
  on public.sync_record_errors(sync_config_id);
create index if not exists idx_sync_errors_retry_status
  on public.sync_record_errors(retry_status) where retry_status = 'pending';
create index if not exists idx_sync_errors_unresolved
  on public.sync_record_errors(sync_config_id, resolved) where resolved = false;

-- ============================================================
-- 005: Log Retention by Plan Tier
-- ============================================================

-- Add log_retention_days to customers (defaults to 30 days)
alter table public.customers
  add column if not exists log_retention_days int not null default 30;

-- Set retention based on existing plan tiers
update public.customers set log_retention_days = 14  where plan_tier = 'free';
update public.customers set log_retention_days = 30  where plan_tier = 'starter';
update public.customers set log_retention_days = 90  where plan_tier = 'professional';
update public.customers set log_retention_days = 365 where plan_tier = 'enterprise';

-- Indexes for the nightly cleanup query
create index if not exists idx_sync_logs_config_started
  on public.sync_logs(sync_config_id, started_at);
create index if not exists idx_sync_errors_log_id
  on public.sync_record_errors(sync_log_id);

-- ============================================================
-- Cleanup function
-- Joins through sync_configs to reach the customer — sync_logs
-- does NOT have a customer_id column directly.
-- ============================================================
create or replace function public.cleanup_old_logs()
returns void
language plpgsql
security definer
as $$
declare
  rec record;
  cutoff timestamptz;
begin
  for rec in
    select id, log_retention_days
    from public.customers
  loop
    cutoff := now() - (rec.log_retention_days || ' days')::interval;

    -- Delete child record errors first (FK constraint)
    delete from public.sync_record_errors sre
    where sre.sync_log_id in (
      select sl.id
      from public.sync_logs sl
      join public.sync_configs sc on sl.sync_config_id = sc.id
      where sc.customer_id = rec.id
        and sl.started_at < cutoff
    );

    -- Then delete the log rows
    delete from public.sync_logs sl
    using public.sync_configs sc
    where sl.sync_config_id = sc.id
      and sc.customer_id = rec.id
      and sl.started_at < cutoff;

  end loop;
end;
$$;

-- ============================================================
-- Schedule nightly cleanup at 3:00 AM UTC via pg_cron
-- BEFORE running this: enable pg_cron in
--   Dashboard → Database → Extensions → pg_cron → Enable
--
-- If pg_cron is not enabled, comment out the line below and
-- call cleanup_old_logs() manually or via an external cron.
-- ============================================================
select cron.schedule(
  'nightly-log-cleanup',
  '0 3 * * *',
  $$ select public.cleanup_old_logs(); $$
);
