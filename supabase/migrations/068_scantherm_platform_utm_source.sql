-- Platform column = utm_source (Beregning + Quick-Heat). Hide extra UTM columns on Scantherm sheet.

update public.lead_sheet_custom_fields
set label = 'Platform'
where field_key = 'utm_source';

update public.lead_sheet_template_columns c
set hidden_for_client = true
from public.lead_sheet_custom_fields f,
     public.lead_sheet_templates t,
     public.organizations o
where c.custom_field_id = f.id
  and c.template_id = t.id
  and t.organization_id = o.id
  and o.slug = 'scantherm-aps'
  and f.field_key in ('utm_medium', 'utm_campaign', 'utm_content', 'utm_term');

update public.lead_funnels f
set
  field_mapping = coalesce(f.field_mapping, '{}'::jsonb)
    || '{"customFields.utm_source": "Platform"}'::jsonb,
  webhook_field_targets = '[
    "leadDate",
    "fullName",
    "email",
    "phone",
    "companyName",
    "customFields.utm_source",
    "customFields.note"
  ]'::jsonb
from public.organizations o
where f.organization_id = o.id
  and o.slug = 'scantherm-aps'
  and f.slug = 'quick-heat-trailer-b2b';
