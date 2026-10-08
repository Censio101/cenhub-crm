-- Per-organization logo backdrop (transparent / white / dark) for portal headers.

alter table public.organizations
  add column if not exists logo_background text not null default 'white';

alter table public.organizations
  drop constraint if exists organizations_logo_background_check;

alter table public.organizations
  add constraint organizations_logo_background_check
  check (logo_background in ('transparent', 'white', 'dark'));
