-- ============================================================
-- sync_record_mappings
-- Tracks Org A record ID ↔ Org B record ID per sync config.
-- This is how we upsert instead of duplicate on re-sync.
-- We store IDs only — never actual field values.
-- ============================================================

create table public.sync_record_mappings (
  id uuid primary key default uuid_generate_v4(),
  sync_config_id uuid not null references public.sync_configs(id) on delete cascade,
  source_org_id uuid not null references public.connected_orgs(id) on delete cascade,
  source_record_id text not null,
  target_org_id uuid not null references public.connected_orgs(id) on delete cascade,
  target_record_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sync_record_mappings enable row level security;

create policy "Users can manage own record mappings"
  on public.sync_record_mappings for all
  using (sync_config_id in (
    select sc.id from public.sync_configs sc
    join public.customers c on sc.customer_id = c.id
    where c.supabase_user_id = auth.uid()
  ));

-- Unique constraint: one source record maps to one target record per sync config
create unique index idx_record_mappings_unique
  on public.sync_record_mappings(sync_config_id, source_org_id, source_record_id);

create index idx_record_mappings_config
  on public.sync_record_mappings(sync_config_id);

create trigger update_record_mappings_updated_at
  before update on public.sync_record_mappings
  for each row execute function public.update_updated_at();
