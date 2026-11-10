-- Last-N log of per-client lead notification email attempts (sent, skipped, failed).

create table public.organization_lead_notify_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  funnel_id uuid references public.lead_funnels (id) on delete set null,
  funnel_name text,
  lead_name text not null default '',
  recipients jsonb not null default '[]'::jsonb,
  status text not null check (status in ('sent', 'skipped', 'failed')),
  skip_reason text,
  error_message text,
  mailgun_message_id text,
  created_at timestamptz not null default now()
);

create index organization_lead_notify_deliveries_org_created_idx
  on public.organization_lead_notify_deliveries (organization_id, created_at desc);

alter table public.organization_lead_notify_deliveries enable row level security;

create policy organization_lead_notify_deliveries_admin
  on public.organization_lead_notify_deliveries
  for all
  using (public.is_censio_admin());

comment on table public.organization_lead_notify_deliveries is
  'Rolling log (trimmed in app to ~20 rows/org) of webhook lead notification emails.';
