-- Counts public login, reset, and invite-redeem attempts so limits hold across servers.
-- No policies: only the service role writes this log.

create table if not exists public.auth_request_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('magiclink', 'recovery', 'redeem_invite')),
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists auth_request_log_kind_ip_created_idx
  on public.auth_request_log (kind, ip_hash, created_at desc);

create index if not exists auth_request_log_kind_created_idx
  on public.auth_request_log (kind, created_at desc);

alter table public.auth_request_log enable row level security;

revoke all on table public.auth_request_log from public, anon, authenticated;
grant all on table public.auth_request_log to service_role;
