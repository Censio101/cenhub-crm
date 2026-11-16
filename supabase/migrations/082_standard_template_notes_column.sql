-- Standard Notes column: shared library field `notes` (textarea), last on every template that
-- does not already have a notes-like custom column (same operational role as sales/LTV/profit).

insert into public.lead_sheet_custom_fields (field_key, label, field_type, config, required)
values ('notes', 'Notes', 'textarea', '{}'::jsonb, false)
on conflict (field_key) do update
  set field_type = 'textarea',
      label = excluded.label;

insert into public.lead_sheet_template_columns (template_id, sort_index, kind, custom_field_id)
select
  t.id,
  coalesce(
    (select max(c.sort_index) from public.lead_sheet_template_columns c where c.template_id = t.id),
    -1
  ) + 1,
  'custom',
  f.id
from public.lead_sheet_templates t
cross join public.lead_sheet_custom_fields f
where f.field_key = 'notes'
  and not exists (
    select 1
    from public.lead_sheet_template_columns c
    join public.lead_sheet_custom_fields cf on cf.id = c.custom_field_id
    where c.template_id = t.id
      and c.kind = 'custom'
      and (
        lower(cf.field_key) in ('note', 'notes', 'notat')
        or lower(cf.field_key) like 'notes\_%' escape '\'
        or lower(trim(cf.label)) in ('note', 'notes', 'notat')
      )
  );