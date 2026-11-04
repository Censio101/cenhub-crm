-- Session afbrudt: use select type so sheet + admin show both allowed values.

update public.lead_sheet_custom_fields
set
  field_type = 'select',
  config = jsonb_set(
    coalesce(config, '{}'::jsonb),
    '{options}',
    coalesce(config->'options', '["abandoned", "nej"]'::jsonb),
    true
  )
where lower(field_key) = 'session_status'
  and field_type <> 'select';
