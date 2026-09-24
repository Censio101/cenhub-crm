create table if not exists public.lead_funnels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  platform text not null default 'website'
    check (platform in ('website', 'landing', 'manual')),
  webhook_secret text not null,
  field_mapping jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index lead_funnels_organization_id_idx on public.lead_funnels (organization_id);

create table if not exists public.lead_inbound_events (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.lead_funnels (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  status_code int not null,
  error_message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index lead_inbound_events_funnel_created_idx
  on public.lead_inbound_events (funnel_id, created_at desc);
