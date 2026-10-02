-- General workspace settings (name, logo, default language, timezone) were removed from the product.
alter table public.censio_workspace_settings
  drop column if exists workspace_name,
  drop column if exists workspace_logo_url,
  drop column if exists default_locale,
  drop column if exists timezone;
