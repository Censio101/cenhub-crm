-- General workspace settings (name, logo, default language, timezone)
-- Stored on the existing singleton row in censio_workspace_settings.

alter table public.censio_workspace_settings
  add column if not exists workspace_name text,
  add column if not exists workspace_logo_url text,
  add column if not exists default_locale text,
  add column if not exists timezone text;
