-- ============================================================
-- OrgSync Initial Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- Customers (tenants)
-- ============================================================
create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  supabase_user_id uuid unique not null references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  plan_tier text not null default 'free' check (plan_tier in ('free', 'starter', 'professional', 'enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "Users can view own customer record"
  on public.customers for select
  using (supabase_user_id = auth.uid());

create policy "Users can update own customer record"
  on public.customers for update
  using (supabase_user_id = auth.uid());

-- ============================================================
-- Connected Salesforce Orgs
-- ============================================================
create table public.connected_orgs (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  org_id text not null,
  instance_url text not null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz,
  label text not null,
  is_sandbox boolean not null default false,
  status text not null default 'active' check (status in ('active', 'disconnected', 'error')),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.connected_orgs enable row level security;

create policy "Users can manage own connected orgs"
  on public.connected_orgs for all
  using (customer_id in (select id from public.customers where supabase_user_id = auth.uid()));

create index idx_connected_orgs_customer on public.connected_orgs(customer_id);

-- ============================================================
-- Cached Object Metadata
-- ============================================================
create table public.org_objects (
  id uuid primary key default uuid_generate_v4(),
  connected_org_id uuid not null references public.connected_orgs(id) on delete cascade,
  api_name text not null,
  label text not null,
  is_custom boolean not null default false,
  is_queryable boolean not null default true,
  last_synced_at timestamptz not null default now()
);

alter table public.org_objects enable row level security;

create policy "Users can view own org objects"
  on public.org_objects for all
  using (connected_org_id in (
    select co.id from public.connected_orgs co
    join public.customers c on co.customer_id = c.id
    where c.supabase_user_id = auth.uid()
  ));

create index idx_org_objects_org on public.org_objects(connected_org_id);
create unique index idx_org_objects_unique on public.org_objects(connected_org_id, api_name);

-- ============================================================
-- Cached Field Metadata
-- ============================================================
create table public.org_fields (
  id uuid primary key default uuid_generate_v4(),
  org_object_id uuid not null references public.org_objects(id) on delete cascade,
  api_name text not null,
  label text not null,
  field_type text not null,
  is_required boolean not null default false,
  is_createable boolean not null default true,
  is_updateable boolean not null default true,
  reference_to text[] -- for Lookup/MasterDetail fields
);

alter table public.org_fields enable row level security;

create policy "Users can view own org fields"
  on public.org_fields for all
  using (org_object_id in (
    select oo.id from public.org_objects oo
    join public.connected_orgs co on oo.connected_org_id = co.id
    join public.customers c on co.customer_id = c.id
    where c.supabase_user_id = auth.uid()
  ));

create index idx_org_fields_object on public.org_fields(org_object_id);
create unique index idx_org_fields_unique on public.org_fields(org_object_id, api_name);

-- ============================================================
-- Sync Configurations
-- ============================================================
create table public.sync_configs (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  source_org_id uuid not null references public.connected_orgs(id) on delete cascade,
  source_object text not null,
  target_org_id uuid not null references public.connected_orgs(id) on delete cascade,
  target_object text not null,
  direction text not null default 'one_way' check (direction in ('one_way', 'bidirectional')),
  trigger_on_create boolean not null default true,
  trigger_on_update boolean not null default false,
  trigger_on_delete boolean not null default false,
  filters jsonb not null default '[]'::jsonb,
  field_mappings jsonb not null default '[]'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sync_configs enable row level security;

create policy "Users can manage own sync configs"
  on public.sync_configs for all
  using (customer_id in (select id from public.customers where supabase_user_id = auth.uid()));

create index idx_sync_configs_customer on public.sync_configs(customer_id);

-- ============================================================
-- Sync Execution Logs
-- ============================================================
create table public.sync_logs (
  id uuid primary key default uuid_generate_v4(),
  sync_config_id uuid not null references public.sync_configs(id) on delete cascade,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  records_processed int not null default 0,
  records_succeeded int not null default 0,
  records_failed int not null default 0,
  error_details jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.sync_logs enable row level security;

create policy "Users can view own sync logs"
  on public.sync_logs for all
  using (sync_config_id in (
    select sc.id from public.sync_configs sc
    join public.customers c on sc.customer_id = c.id
    where c.supabase_user_id = auth.uid()
  ));

create index idx_sync_logs_config on public.sync_logs(sync_config_id);
create index idx_sync_logs_started on public.sync_logs(started_at desc);

-- ============================================================
-- Individual Record Errors (for retry)
-- ============================================================
create table public.sync_record_errors (
  id uuid primary key default uuid_generate_v4(),
  sync_log_id uuid not null references public.sync_logs(id) on delete cascade,
  source_record_id text not null,
  error_message text not null,
  error_code text,
  retry_count int not null default 0,
  retried_at timestamptz,
  resolved boolean not null default false
);

alter table public.sync_record_errors enable row level security;

create policy "Users can view own sync errors"
  on public.sync_record_errors for all
  using (sync_log_id in (
    select sl.id from public.sync_logs sl
    join public.sync_configs sc on sl.sync_config_id = sc.id
    join public.customers c on sc.customer_id = c.id
    where c.supabase_user_id = auth.uid()
  ));

create index idx_sync_errors_log on public.sync_record_errors(sync_log_id);

-- ============================================================
-- Support Tickets
-- ============================================================
create table public.support_tickets (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  subject text not null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

create policy "Users can manage own tickets"
  on public.support_tickets for all
  using (customer_id in (select id from public.customers where supabase_user_id = auth.uid()));

create index idx_tickets_customer on public.support_tickets(customer_id);

-- ============================================================
-- Support Ticket Messages (thread)
-- ============================================================
create table public.ticket_messages (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer', 'admin')),
  sender_id uuid not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.ticket_messages enable row level security;

create policy "Users can view own ticket messages"
  on public.ticket_messages for all
  using (ticket_id in (
    select st.id from public.support_tickets st
    join public.customers c on st.customer_id = c.id
    where c.supabase_user_id = auth.uid()
  ));

create index idx_ticket_messages_ticket on public.ticket_messages(ticket_id);

-- ============================================================
-- Plan Features (admin-managed)
-- ============================================================
create table public.plan_features (
  id uuid primary key default uuid_generate_v4(),
  plan_tier text unique not null check (plan_tier in ('free', 'starter', 'professional', 'enterprise')),
  max_connected_orgs int not null default 1,
  max_sync_configs int not null default 1,
  max_objects_per_sync int not null default 5,
  max_records_per_month int not null default 1000,
  can_use_filters boolean not null default false,
  can_use_bidirectional boolean not null default false,
  can_use_delete_sync boolean not null default false,
  can_use_scheduling boolean not null default false
);

-- Seed default plan features
insert into public.plan_features (plan_tier, max_connected_orgs, max_sync_configs, max_objects_per_sync, max_records_per_month, can_use_filters, can_use_bidirectional, can_use_delete_sync, can_use_scheduling) values
  ('free', 1, 1, 3, 500, false, false, false, false),
  ('starter', 2, 3, 5, 5000, false, false, false, false),
  ('professional', 5, 999, 999, 50000, true, true, true, true),
  ('enterprise', 999, 999, 999, 999999999, true, true, true, true);

-- plan_features is public read (no sensitive data)
alter table public.plan_features enable row level security;

create policy "Anyone can view plan features"
  on public.plan_features for select
  using (true);

-- ============================================================
-- Admin Users
-- ============================================================
create table public.admin_users (
  id uuid primary key default uuid_generate_v4(),
  supabase_user_id uuid unique not null references auth.users(id) on delete cascade,
  email text unique not null,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "Admins can view admin records"
  on public.admin_users for select
  using (supabase_user_id = auth.uid());

-- ============================================================
-- Auto-create customer record on new user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.customers (supabase_user_id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Auto-update updated_at timestamps
-- ============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_customers_updated_at
  before update on public.customers
  for each row execute function public.update_updated_at();

create trigger update_connected_orgs_updated_at
  before update on public.connected_orgs
  for each row execute function public.update_updated_at();

create trigger update_sync_configs_updated_at
  before update on public.sync_configs
  for each row execute function public.update_updated_at();

create trigger update_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.update_updated_at();
