-- Remember the name of the chosen Meta pixel next to its ID, so the settings page can show it at
-- once instead of waiting for the pixel list to load from Meta.
alter table public.client_meta_config
  add column if not exists meta_pixel_name text not null default '',
  add column if not exists meta_pixel_is_crm boolean not null default false;
