-- Services column: picker (dropdown) vs text (show inbound labels) on lead sheet template.
alter table public.lead_sheet_template_columns
  add column if not exists service_ids_editor text not null default 'picker';

alter table public.lead_sheet_template_columns
  drop constraint if exists lead_sheet_template_columns_service_ids_editor_check;

alter table public.lead_sheet_template_columns
  add constraint lead_sheet_template_columns_service_ids_editor_check
  check (service_ids_editor in ('picker', 'text'));

comment on column public.lead_sheet_template_columns.service_ids_editor is
  'How the Services builtin column is edited: picker = CRM multi-select; text = raw inbound labels.';

-- Raw service labels from webhooks/import when sheet uses text mode; service_ids still holds matched slugs.
alter table public.leads
  add column if not exists service_labels text[] not null default '{}';

comment on column public.leads.service_labels is
  'Display labels for services when the lead sheet uses text mode; slugs remain in service_ids.';
