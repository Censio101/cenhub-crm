-- When each form was last seen on the Meta Page (set by "Refresh"; null = never refreshed).
alter table public.meta_lead_forms
  add column if not exists synced_at timestamptz;

update public.meta_lead_forms
  set synced_at = updated_at
  where synced_at is null;
