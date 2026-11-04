alter table public.organizations
  add column if not exists logo_size smallint not null default 2;

alter table public.organizations
  drop constraint if exists organizations_logo_size_check;

alter table public.organizations
  add constraint organizations_logo_size_check check (logo_size between 0 and 4);
