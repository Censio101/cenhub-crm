-- Cached Meta Lead Ads preview rows (admin manual review; refreshed from Graph on demand)

create table if not exists public.meta_leads_preview_cache (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  days_back integer not null default 90,
  total_count integer not null default 0,
  synced_at timestamptz not null default now()
);

create table if not exists public.meta_leads_preview_rows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  meta_lead_id text not null,
  meta_form_id text not null,
  form_name text not null default '',
  created_time timestamptz,
  fields jsonb not null default '{}'::jsonb,
  unique (organization_id, meta_lead_id)
);

create index meta_leads_preview_rows_org_created_idx
  on public.meta_leads_preview_rows (organization_id, created_time desc nulls last);

alter table public.meta_leads_preview_cache enable row level security;
alter table public.meta_leads_preview_rows enable row level security;

create policy meta_leads_preview_cache_admin on public.meta_leads_preview_cache for all using (
  public.is_censio_admin()
);

create policy meta_leads_preview_rows_admin on public.meta_leads_preview_rows for all using (
  public.is_censio_admin()
);
