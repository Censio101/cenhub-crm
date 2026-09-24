alter table public.censio_workspace_settings
  add column if not exists onboarding_notify_emails text;

comment on column public.censio_workspace_settings.onboarding_notify_emails is
  'Comma or newline separated admin emails notified when a public onboarding application is submitted.';
