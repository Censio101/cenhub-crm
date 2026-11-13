-- Notes-labeled library fields should stay textarea (sheet modal editor). Re-run safely when
-- a field was added later as plain text (e.g. notes_2 on a client sheet).

update public.lead_sheet_custom_fields
set field_type = 'textarea'
where field_type is distinct from 'textarea'
  and (
    lower(field_key) in ('note', 'notes', 'notat')
    or lower(field_key) like 'notes\_%' escape '\'
    or lower(trim(label)) in ('note', 'notes', 'notat')
  );

do $$
declare
  tpl record;
  note_ids uuid[];
  other_ids uuid[];
  final_order uuid[];
begin
  for tpl in
    select distinct template_id
    from public.lead_sheet_template_columns
  loop
    select coalesce(array_agg(c.id order by c.sort_index), '{}'::uuid[])
    into note_ids
    from public.lead_sheet_template_columns c
    join public.lead_sheet_custom_fields f on f.id = c.custom_field_id
    where c.template_id = tpl.template_id
      and c.kind = 'custom'
      and f.field_type = 'textarea'
      and (
        lower(f.field_key) in ('note', 'notes', 'notat')
        or lower(f.field_key) like 'notes\_%' escape '\'
        or lower(trim(f.label)) in ('note', 'notes', 'notat')
      );

    if coalesce(array_length(note_ids, 1), 0) = 0 then
      continue;
    end if;

    select coalesce(array_agg(c.id order by c.sort_index), '{}'::uuid[])
    into other_ids
    from public.lead_sheet_template_columns c
    where c.template_id = tpl.template_id
      and not (c.id = any (note_ids));

    final_order := other_ids || note_ids;

    perform public.reorder_lead_sheet_template_columns(tpl.template_id, final_order);
  end loop;
end;
$$;
