-- Manual services belong to one client: organization_id is set, they are never part of a
-- category and other clients never see them. Category services keep organization_id null.

alter table public.services
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

create index if not exists services_organization_idx on public.services (organization_id);
