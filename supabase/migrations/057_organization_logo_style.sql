-- Logo chip style a client can choose on the Company page: padding and corner radius, in 5 steps
-- (0 = none ... 4 = most). Step 2 is the look the logo had before these options existed.
alter table public.organizations
  add column if not exists logo_padding smallint not null default 2,
  add column if not exists logo_radius smallint not null default 2;

alter table public.organizations
  drop constraint if exists organizations_logo_padding_check,
  drop constraint if exists organizations_logo_radius_check;

alter table public.organizations
  add constraint organizations_logo_padding_check check (logo_padding between 0 and 4),
  add constraint organizations_logo_radius_check check (logo_radius between 0 and 4);
