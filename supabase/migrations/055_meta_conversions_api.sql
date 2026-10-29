-- Send the value of a won Meta lead back to Meta (Conversions API for CRM).
-- The switch lives on the client's Meta config; every event to send is queued in an outbox table.

alter table public.client_meta_config
  add column if not exists capi_enabled boolean not null default false;

create table if not exists public.meta_capi_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  -- The 15-17 digit Meta lead ID (leads.legacy_id of a lead that came from a Meta form).
  meta_lead_id text not null default '',
  event_name text not null,
  -- When the lead was won. Meta only accepts events up to 7 days old.
  event_time timestamptz not null,
  value numeric,
  currency text not null default 'DKK',
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped', 'expired')),
  attempts integer not null default 0,
  last_error text,
  skip_reason text,
  meta_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  -- One event per lead and stage: a lead is never sent twice.
  unique (lead_id, event_name)
);

create index if not exists meta_capi_events_status_idx
  on public.meta_capi_events (status, created_at);
create index if not exists meta_capi_events_org_idx
  on public.meta_capi_events (organization_id, created_at desc);

create trigger meta_capi_events_updated_at before update on public.meta_capi_events
  for each row execute function public.set_updated_at();

-- No policies: only the server (service role) reads and writes the outbox.
alter table public.meta_capi_events enable row level security;
