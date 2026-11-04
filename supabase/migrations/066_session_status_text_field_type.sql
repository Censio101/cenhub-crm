-- Session afbrudt: reference text only (not a sheet dropdown).

update public.lead_sheet_custom_fields
set field_type = 'text'
where lower(field_key) = 'session_status'
  and field_type <> 'text';
