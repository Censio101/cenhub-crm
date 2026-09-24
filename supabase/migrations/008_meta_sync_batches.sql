-- Meta sync batch runs (cron / admin sync-all) and skipped per-org runs

create table public.meta_sync_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}',
  triggered_by uuid references auth.users (id) on delete set null
);

create index meta_sync_batches_started_at_idx on public.meta_sync_batches (started_at desc);

alter table public.meta_sync_runs
  add column if not exists batch_id uuid references public.meta_sync_batches (id) on delete set null;

alter table public.meta_sync_runs drop constraint if exists meta_sync_runs_status_check;

alter table public.meta_sync_runs
  add constraint meta_sync_runs_status_check
  check (status in ('success', 'error', 'running', 'skipped'));

create index meta_sync_runs_batch_id_idx on public.meta_sync_runs (batch_id);
create index meta_sync_runs_org_started_idx on public.meta_sync_runs (organization_id, started_at desc);

alter table public.meta_sync_batches enable row level security;

create policy meta_sync_batches_admin_all on public.meta_sync_batches for all using (
  public.is_censio_admin()
);
