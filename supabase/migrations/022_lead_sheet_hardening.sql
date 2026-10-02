-- 1) Deleting a template column used to leave its custom field row behind, which blocked
--    re-adding a column with the same field key (unique (template_id, field_key)).
delete from public.lead_sheet_custom_fields f
where not exists (
  select 1
  from public.lead_sheet_template_columns c
  where c.custom_field_id = f.id
);

-- 2) Set when a client's lead sheet changed while it already had webhooks, so an admin
--    can review the expected payload. Cleared by "Mark as reviewed" on the Funnels page.
alter table public.organizations
  add column if not exists webhook_payload_stale_since timestamptz;
