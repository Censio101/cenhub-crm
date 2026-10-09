-- Hvidbjerg certified marketing program (admin-controlled per organization).
alter table public.organizations
  add column if not exists hvidbjerg_partner boolean not null default false;
