-- Client sessions may read Meta settings (enabled, pixel, sync status) but not access tokens.
-- The service role still reads the full row for webhooks and sync.

revoke select on table public.client_meta_config from anon, authenticated;

grant select (
  organization_id,
  meta_ad_account_id,
  meta_page_id,
  meta_pixel_id,
  meta_pixel_name,
  meta_pixel_is_crm,
  meta_sync_status,
  meta_sync_error,
  meta_last_synced_at,
  enabled,
  capi_enabled,
  created_at,
  updated_at
) on table public.client_meta_config to authenticated;
