-- ============================================================
-- CPQ/RCA Integration Jobs
-- Migration 011
-- ============================================================

-- ─── CPQ Jobs (the top-level job definition) ─────────────────

create table public.cpq_jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  description text,
  source_org_id uuid not null references public.connected_orgs(id),
  target_org_id uuid not null references public.connected_orgs(id),
  interval_minutes int not null default 60,
  is_active boolean not null default false,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cpq_jobs enable row level security;

create policy "Users can manage own cpq jobs"
  on public.cpq_jobs for all
  using (customer_id in (select id from public.customers where supabase_user_id = auth.uid()));

create index idx_cpq_jobs_customer on public.cpq_jobs(customer_id);

-- ─── CPQ Job Objects (ordered steps within a job) ────────────

create table public.cpq_job_objects (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.cpq_jobs(id) on delete cascade,
  step_order int not null,
  label text,                              -- user-defined step name e.g. "Products"
  source_object text not null,
  target_object text not null,
  field_mappings jsonb not null default '[]'::jsonb,
  filters jsonb not null default '[]'::jsonb,
  record_type_config jsonb not null default '{"strategy":"none"}'::jsonb,
  owner_config jsonb,
  created_at timestamptz not null default now()
);

alter table public.cpq_job_objects enable row level security;

create policy "Users can manage own cpq job objects"
  on public.cpq_job_objects for all
  using (job_id in (
    select j.id from public.cpq_jobs j
    join public.customers c on j.customer_id = c.id
    where c.supabase_user_id = auth.uid()
  ));

create index idx_cpq_job_objects_job on public.cpq_job_objects(job_id);

-- ─── CPQ Job Runs (execution history) ────────────────────────

create table public.cpq_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.cpq_jobs(id) on delete cascade,
  status text not null default 'running'
    check (status in ('running', 'success', 'partial', 'failed')),
  triggered_by text not null default 'schedule'
    check (triggered_by in ('schedule', 'manual')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.cpq_job_runs enable row level security;

create policy "Users can view own cpq job runs"
  on public.cpq_job_runs for all
  using (job_id in (
    select j.id from public.cpq_jobs j
    join public.customers c on j.customer_id = c.id
    where c.supabase_user_id = auth.uid()
  ));

create index idx_cpq_job_runs_job on public.cpq_job_runs(job_id);
create index idx_cpq_job_runs_started on public.cpq_job_runs(started_at desc);

-- ─── CPQ Job Run Steps (per-object execution within a run) ───

create table public.cpq_job_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.cpq_job_runs(id) on delete cascade,
  job_object_id uuid references public.cpq_job_objects(id) on delete set null,
  step_order int not null,
  source_object text not null,
  target_object text not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'success', 'partial', 'failed', 'skipped')),
  records_queried int not null default 0,
  records_succeeded int not null default 0,
  records_failed int not null default 0,
  error_details jsonb,
  skip_reason text,
  started_at timestamptz,
  completed_at timestamptz
);

alter table public.cpq_job_run_steps enable row level security;

create policy "Users can view own cpq job run steps"
  on public.cpq_job_run_steps for all
  using (run_id in (
    select r.id from public.cpq_job_runs r
    join public.cpq_jobs j on r.job_id = j.id
    join public.customers c on j.customer_id = c.id
    where c.supabase_user_id = auth.uid()
  ));

create index idx_cpq_run_steps_run on public.cpq_job_run_steps(run_id);

-- ─── Auto-update updated_at on cpq_jobs ──────────────────────

create trigger update_cpq_jobs_updated_at
  before update on public.cpq_jobs
  for each row execute function public.update_updated_at();
