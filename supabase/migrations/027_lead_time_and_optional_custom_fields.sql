-- A lead's time of day, kept next to `lead_date` (which stays a real day for filters and
-- sorting). The Date column shows both as text: the day first, then the time.
alter table public.leads
  add column if not exists lead_time text
    check (lead_time is null or lead_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- Custom fields are never required; only Full name, Email and Phone are (in the Add Lead popup).
update public.lead_sheet_custom_fields set required = false where required;
