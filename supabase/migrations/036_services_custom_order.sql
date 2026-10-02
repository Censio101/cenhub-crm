-- false = a client's services follow the default order (its categories, other categories,
-- manual); true = an admin arranged them by hand and sort_index is used as saved.
alter table public.organizations
  add column if not exists services_custom_order boolean not null default false;
