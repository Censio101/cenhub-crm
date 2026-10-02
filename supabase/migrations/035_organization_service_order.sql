-- The order an admin arranged a client's services in; the dashboard dropdowns follow it.
alter table public.organization_services
  add column if not exists sort_index integer not null default 0;
