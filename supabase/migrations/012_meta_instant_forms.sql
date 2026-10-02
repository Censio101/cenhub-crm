-- Meta Lead Ads instant forms: per-form config, inbound audit, lead extras

alter table public.leads
  add column if not exists meta_form_id text,
  add column if not exists meta_extra jsonb not null default '{}'::jsonb;

create index if not exists leads_meta_form_id_idx
  on public.leads (organization_id, meta_form_id)
  where meta_form_id is not null;

create table if not exists public.meta_lead_forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  meta_form_id text not null,
  name text not null default '',
  status text not null default '',
  enabled boolean not null default false,
  field_mapping jsonb not null default '{}'::jsonb,
  questions_snapshot jsonb not null default '[]'::jsonb,
  leads_count_cached integer,
  last_lead_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, meta_form_id)
);

create index meta_lead_forms_organization_id_idx on public.meta_lead_forms (organization_id);

create table if not exists public.meta_lead_inbound_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  meta_form_id text,
  meta_lead_id text,
  status_code int not null,
  error_message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index meta_lead_inbound_events_org_created_idx
  on public.meta_lead_inbound_events (organization_id, created_at desc);

create unique index if not exists client_meta_config_meta_page_id_unique_idx
  on public.client_meta_config (meta_page_id)
  where meta_page_id is not null and meta_page_id <> '' and enabled = true;

create trigger meta_lead_forms_updated_at before update on public.meta_lead_forms
  for each row execute function public.set_updated_at();

alter table public.meta_lead_forms enable row level security;
alter table public.meta_lead_inbound_events enable row level security;

create policy meta_lead_forms_select on public.meta_lead_forms for select using (
  public.is_censio_admin() or organization_id = public.current_organization_id()
);

create policy meta_lead_forms_admin_write on public.meta_lead_forms for all using (
  public.is_censio_admin()
);

create policy meta_lead_inbound_events_select on public.meta_lead_inbound_events for select using (
  public.is_censio_admin() or organization_id = public.current_organization_id()
);

create policy meta_lead_inbound_events_admin_write on public.meta_lead_inbound_events for all using (
  public.is_censio_admin()
);
