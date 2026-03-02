-- ============================================================
-- Migration 005: Log Retention by Plan Tier
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add log_retention_days to customers
--    Defaults to 30 (Starter). Update based on plan_tier below.
alter table public.customers
  add column if not exists log_retention_days int not null default 30;

-- 2. Set retention based on existing plan tiers
update public.customers set log_retention_days = 30  where plan_tier = 'starter';
update public.customers set log_retention_days = 90  where plan_tier = 'professional';
update public.customers set log_retention_days = 365 where plan_tier = 'enterprise';

-- 3. Index to make the nightly cleanup fast
create index if not exists idx_sync_logs_customer_started
  on public.sync_logs(customer_id, started_at);

create index if not exists idx_sync_errors_log
  on public.sync_record_errors(sync_log_id);

-- ============================================================
-- 4. Cleanup function
--    Deletes per-record errors first (child rows), then logs
--    (parent rows) that are older than the customer's retention
--    window. Runs per customer so each gets their own limit.
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
    delete from public.sync_record_errors
    where sync_log_id in (
      select id
      from public.sync_logs
      where customer_id = rec.id
        and started_at < cutoff
    );

    -- Delete the log rows themselves
    delete from public.sync_logs
    where customer_id = rec.id
      and started_at < cutoff;

  end loop;
end;
$$;

-- ============================================================
-- 5. Schedule nightly cleanup at 3:00 AM UTC via pg_cron
--    pg_cron must be enabled in Supabase:
--    Dashboard → Database → Extensions → pg_cron → Enable
-- ============================================================
select cron.schedule(
  'nightly-log-cleanup',           -- job name (unique)
  '0 3 * * *',                     -- every day at 03:00 UTC
  $$ select public.cleanup_old_logs(); $$
);

-- ============================================================
-- HOW TO UPDATE RETENTION WHEN A CUSTOMER UPGRADES:
--
--   update public.customers
--   set log_retention_days = 90,
--       plan_tier = 'professional'
--   where id = '<customer_id>';
--
-- The next nightly run will automatically respect the new limit.
-- ============================================================
