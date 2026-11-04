-- Session afbrudt: store canonical `abandoned` / `nej` instead of legacy Ja / Nej.

update public.lead_sheet_custom_fields
set config = jsonb_set(coalesce(config, '{}'::jsonb), '{options}', '["abandoned", "nej"]'::jsonb, true)
where lower(field_key) = 'session_status';

update public.leads
set custom_fields = jsonb_set(custom_fields, '{session_status}', '"abandoned"'::jsonb, true)
where jsonb_exists(custom_fields, 'session_status')
  and (
    lower(trim(both from custom_fields->>'session_status')) in ('ja', 'yes', 'true', '1', 'afbrudt', 'abandoned')
    or lower(custom_fields->>'session_status') like '%abandon%'
    or lower(custom_fields->>'session_status') like '%afbrud%'
  );

update public.leads
set custom_fields = jsonb_set(custom_fields, '{session_status}', '"nej"'::jsonb, true)
where jsonb_exists(custom_fields, 'session_status')
  and lower(trim(both from custom_fields->>'session_status')) in ('nej', 'no', 'false', '0');
