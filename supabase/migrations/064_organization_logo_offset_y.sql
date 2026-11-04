alter table public.organizations
  add column if not exists logo_offset_y smallint not null default 2;

alter table public.organizations
  drop constraint if exists organizations_logo_offset_y_check;

alter table public.organizations
  add constraint organizations_logo_offset_y_check check (logo_offset_y between 0 and 4);
