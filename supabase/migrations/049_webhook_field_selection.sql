-- Per-column: include in webhook docs / mapping (default on for existing columns).
alter table public.lead_sheet_template_columns
  add column if not exists webhook_included boolean not null default true;

-- Per-funnel subset of sheet-eligible targets; null = all eligible from the sheet.
alter table public.lead_funnels
  add column if not exists webhook_field_targets jsonb;

comment on column public.lead_funnels.webhook_field_targets is
  'Optional JSON array of mapping target keys (e.g. fullName, customFields.annonce). Null means all sheet-eligible fields.';
