alter table public.profiles
  add column if not exists preferred_locale text not null default 'da'
  check (preferred_locale in ('da', 'en'));
