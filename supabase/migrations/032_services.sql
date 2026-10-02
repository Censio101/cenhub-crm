-- Service library: Censio defines services, business categories carry default services,
-- and a client gets the services of every category it is tagged with (plus per-client overrides).
-- Leads keep storing the service slug in leads.service_ids, so the slug never changes.

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,64}$'),
  name_da text not null check (char_length(name_da) between 1 and 80),
  name_en text not null check (char_length(name_en) between 1 and 80),
  sort_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.category_services (
  category_id uuid not null references public.business_categories (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  sort_index integer not null default 0,
  primary key (category_id, service_id)
);

create index if not exists category_services_service_idx on public.category_services (service_id);

-- Per-client overrides on top of the category defaults.
--   added  = shown even though no assigned category includes it
--   hidden = a category default that this client does not offer
create table if not exists public.organization_services (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  mode text not null check (mode in ('added', 'hidden')),
  created_at timestamptz not null default now(),
  primary key (organization_id, service_id)
);

create index if not exists organization_services_service_idx
  on public.organization_services (service_id);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

alter table public.services enable row level security;
alter table public.category_services enable row level security;
alter table public.organization_services enable row level security;

-- Written and read by the server (service role) only; admins may also manage them directly.
create policy services_admin on public.services for all using (public.is_censio_admin());
create policy category_services_admin on public.category_services for all using (
  public.is_censio_admin()
);
create policy organization_services_admin on public.organization_services for all using (
  public.is_censio_admin()
);

-- The five services that were hardcoded in the app, with their original ids.
insert into public.services (slug, name_da, name_en, sort_index) values
  ('renovering', 'Renovering', 'Renovation', 0),
  ('tagdaekning', 'Tagdækning', 'Roofing', 1),
  ('tilbygning', 'Tilbygning', 'Extension', 2),
  ('nybyg', 'Nybyg', 'New build', 3),
  ('badevaerelse', 'Badeværelse', 'Bathroom', 4)
on conflict (slug) do nothing;

-- Existing clients keep seeing exactly these five until an admin tidies the list.
insert into public.organization_services (organization_id, service_id, mode)
select o.id, s.id, 'added'
from public.organizations o
cross join public.services s
where s.slug in ('renovering', 'tagdaekning', 'tilbygning', 'nybyg', 'badevaerelse')
on conflict do nothing;
