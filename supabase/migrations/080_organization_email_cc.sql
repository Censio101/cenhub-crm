alter table public.organization_email_settings
  add column if not exists cc_notify_emails text;
