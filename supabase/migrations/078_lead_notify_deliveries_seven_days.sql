-- Keep lead notification email history for 7 days (trimmed in app on insert).

comment on table public.organization_lead_notify_deliveries is
  'Lead notification email attempts. App keeps the last 7 days per organization.';
