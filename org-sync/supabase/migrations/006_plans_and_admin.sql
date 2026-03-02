-- ============================================================
-- Migration 006: Plan Definitions + Admin Enhancements
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add is_suspended flag to customers
alter table public.customers
  add column if not exists is_suspended boolean not null default false;

-- 2. Add can_use_ai flag to plan_features
alter table public.plan_features
  add column if not exists can_use_ai boolean not null default false;

-- 3. Add log_retention_days to plan_features (single source of truth)
alter table public.plan_features
  add column if not exists log_retention_days int not null default 30;

-- 4. Upsert canonical plan definitions
--    Starter  : 2 orgs, 3 syncs, 10k records, no filters/bi-di/AI, 30-day logs
--    Growth   : 5 orgs, unlimited syncs, 100k records, all features, 90-day logs
--    Enterprise: unlimited everything, 1-year logs
insert into public.plan_features (
  plan_tier,
  max_connected_orgs, max_sync_configs, max_objects_per_sync,
  max_records_per_month,
  can_use_filters, can_use_bidirectional, can_use_delete_sync,
  can_use_scheduling, can_use_ai,
  log_retention_days
) values
  ('free',         1,   1,   3,         500,       false, false, false, false, false, 14),
  ('starter',      2,   3,   5,         10000,     false, false, false, false, false, 30),
  ('professional', 5,   999, 999,       100000,    true,  true,  true,  true,  true,  90),
  ('enterprise',   999, 999, 999,       999999999, true,  true,  true,  true,  true,  365)
on conflict (plan_tier) do update set
  max_connected_orgs    = excluded.max_connected_orgs,
  max_sync_configs      = excluded.max_sync_configs,
  max_objects_per_sync  = excluded.max_objects_per_sync,
  max_records_per_month = excluded.max_records_per_month,
  can_use_filters       = excluded.can_use_filters,
  can_use_bidirectional = excluded.can_use_bidirectional,
  can_use_delete_sync   = excluded.can_use_delete_sync,
  can_use_scheduling    = excluded.can_use_scheduling,
  can_use_ai            = excluded.can_use_ai,
  log_retention_days    = excluded.log_retention_days;

-- 5. Rename 'professional' tier values to 'growth' in plan_tier check constraint
--    (Optional — only if you want to rename the tier key itself)
--    Skipping rename to avoid cascading changes; we keep 'professional' as the DB key
--    and display it as "Growth" in the UI.

-- 6. Sync log_retention_days on customers table from plan_features
--    (column was added in 005_log_retention.sql — guard against it not existing)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'customers'
      and column_name  = 'log_retention_days'
  ) then
    update public.customers c
    set log_retention_days = pf.log_retention_days
    from public.plan_features pf
    where pf.plan_tier = c.plan_tier;
  end if;
end $$;

-- 7. Index for admin queries
create index if not exists idx_customers_plan on public.customers(plan_tier);
create index if not exists idx_customers_suspended on public.customers(is_suspended) where is_suspended = true;

-- ============================================================
-- HOW TO INSERT YOUR FIRST ADMIN USER:
--
-- 1. Sign up normally at /signup with your admin email
-- 2. Run this in SQL Editor (replace with your actual Supabase user id):
--
--    insert into public.admin_users (supabase_user_id, email, role)
--    values ('<your-supabase-user-uuid>', 'you@yourdomain.com', 'super_admin');
--
-- 3. Visit /admin — you'll be let in.
-- ============================================================
