-- Counts authenticated full-list API reads (leads/customers) so limits hold across Vercel instances.

create table if not exists public.bulk_list_read_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null,
  route text not null check (route in ('leads', 'customers')),
  created_at timestamptz not null default now()
);

create index if not exists bulk_list_read_log_scope_created_idx
  on public.bulk_list_read_log (organization_id, user_id, route, created_at desc);

create index if not exists bulk_list_read_log_created_idx
  on public.bulk_list_read_log (created_at desc);

alter table public.bulk_list_read_log enable row level security;

revoke all on table public.bulk_list_read_log from public, anon, authenticated;
grant all on table public.bulk_list_read_log to service_role;