-- Censio CRM — initial schema (Supabase Postgres)

create extension if not exists "pgcrypto";

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,48}$'),
  name text not null,
  logo_url text,
  demo_mode boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  role text not null check (role in ('censio_admin', 'client_admin', 'client_user')),
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  lead_date date not null,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  segment text not null default '' check (segment in ('', 'b2c', 'b2b')),
  company_name text not null default '',
  address text not null default '',
  zip_code text not null default '',
  city text not null default '',
  service_ids text[] not null default '{}',
  service_legacy text not null default '',
  platform text not null default '' check (platform in ('', 'meta', 'website', 'landing')),
  meta_ad_id text not null default '',
  status text not null default 'new_waiting_call',
  sales_price numeric,
  profit numeric,
  source text not null default 'demo' check (source in ('demo', 'meta', 'website', 'landing', 'manual')),
  locked_fields text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, legacy_id)
);

create index leads_organization_id_idx on public.leads (organization_id);
create index leads_lead_date_idx on public.leads (lead_date desc);
create index leads_status_idx on public.leads (status);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid not null unique references public.leads (id) on delete cascade,
  closed_date date not null,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  segment text not null check (segment in ('b2c', 'b2b')),
  company_name text not null default '',
  address text not null default '',
  zip_code text not null default '',
  city text not null default '',
  service_ids text[] not null default '{}',
  sales_price numeric not null default 0,
  profit numeric not null default 0,
  source text not null default 'other' check (source in ('facebook', 'instagram', 'website', 'landing', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_organization_id_idx on public.customers (organization_id);

create table public.client_meta_config (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  meta_ad_account_id text,
  meta_page_id text,
  meta_pixel_id text,
  meta_system_user_token_encrypted text,
  meta_page_access_token_encrypted text,
  meta_sync_status text not null default 'disabled',
  meta_sync_error text,
  meta_last_synced_at timestamptz,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_ad_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  month_key text not null,
  spend numeric not null default 0,
  clicks integer not null default 0,
  impressions integer not null default 0,
  leads_count integer,
  payload jsonb not null default '{}',
  synced_at timestamptz not null default now(),
  unique (organization_id, month_key)
);

create index client_ad_metrics_org_month_idx on public.client_ad_metrics (organization_id, month_key desc);

create table public.meta_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  status text not null check (status in ('success', 'error', 'running')),
  message text,
  details jsonb not null default '{}',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger client_meta_config_updated_at before update on public.client_meta_config
  for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.customers enable row level security;
alter table public.client_meta_config enable row level security;
alter table public.client_ad_metrics enable row level security;
alter table public.meta_sync_runs enable row level security;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_censio_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'censio_admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

create policy profiles_select_own on public.profiles for select using (
  id = auth.uid() or public.is_censio_admin()
);

create policy profiles_update_own on public.profiles for update using (
  id = auth.uid() or public.is_censio_admin()
);

create policy organizations_select on public.organizations for select using (
  public.is_censio_admin() or id = public.current_organization_id()
);

create policy organizations_admin_write on public.organizations for all using (
  public.is_censio_admin()
);

create policy leads_select on public.leads for select using (
  public.is_censio_admin() or organization_id = public.current_organization_id()
);

create policy leads_insert on public.leads for insert with check (
  public.is_censio_admin() or organization_id = public.current_organization_id()
);

create policy leads_update on public.leads for update using (
  public.is_censio_admin() or organization_id = public.current_organization_id()
);

create policy leads_delete on public.leads for delete using (
  public.is_censio_admin() or organization_id = public.current_organization_id()
);

create policy customers_select on public.customers for select using (
  public.is_censio_admin() or organization_id = public.current_organization_id()
);

create policy customers_write on public.customers for all using (
  public.is_censio_admin() or organization_id = public.current_organization_id()
);

create policy meta_config_select on public.client_meta_config for select using (
  public.is_censio_admin() or organization_id = public.current_organization_id()
);

create policy meta_config_admin_write on public.client_meta_config for all using (
  public.is_censio_admin()
);

create policy ad_metrics_select on public.client_ad_metrics for select using (
  public.is_censio_admin() or organization_id = public.current_organization_id()
);

create policy ad_metrics_admin_write on public.client_ad_metrics for all using (
  public.is_censio_admin()
);

create policy meta_sync_runs_select on public.meta_sync_runs for select using (
  public.is_censio_admin() or organization_id = public.current_organization_id()
);

create policy meta_sync_runs_admin_write on public.meta_sync_runs for all using (
  public.is_censio_admin()
);

insert into public.organizations (slug, name, demo_mode)
values ('nordkystens-tomrer', 'Nordkystens Tømrer', true)
on conflict (slug) do nothing;

insert into public.organizations (slug, name, demo_mode)
values ('demo-meta-client', 'Demo Meta Client', true)
on conflict (slug) do nothing;
