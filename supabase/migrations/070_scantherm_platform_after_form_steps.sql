-- Scantherm: Platform (utm_source) sits after Form steps on the lead sheet template.

do $$
declare
  tpl_id uuid;
  ordered_ids uuid[];
  form_progress_id uuid;
  platform_id uuid;
  final_order uuid[];
  i int;
begin
  select t.id
  into tpl_id
  from public.lead_sheet_templates t
  inner join public.organizations o on o.id = t.organization_id
  where o.slug = 'scantherm-aps'
  order by t.created_at
  limit 1;

  if tpl_id is null then
    return;
  end if;

  select coalesce(array_agg(c.id order by c.sort_index), '{}'::uuid[])
  into ordered_ids
  from public.lead_sheet_template_columns c
  where c.template_id = tpl_id;

  select c.id
  into form_progress_id
  from public.lead_sheet_template_columns c
  where c.template_id = tpl_id
    and c.kind = 'builtin'
    and c.builtin_key = 'formProgress';

  select c.id
  into platform_id
  from public.lead_sheet_template_columns c
  inner join public.lead_sheet_custom_fields f on f.id = c.custom_field_id
  where c.template_id = tpl_id
    and c.kind = 'custom'
    and f.field_key = 'utm_source';

  if platform_id is null then
    return;
  end if;

  final_order := array[]::uuid[];
  for i in 1 .. coalesce(array_length(ordered_ids, 1), 0) loop
    if ordered_ids[i] = platform_id then
      continue;
    end if;
    final_order := final_order || ordered_ids[i];
    if form_progress_id is not null and ordered_ids[i] = form_progress_id then
      final_order := final_order || platform_id;
    end if;
  end loop;

  if not (platform_id = any (final_order)) then
    final_order := final_order || platform_id;
  end if;

  perform public.reorder_lead_sheet_template_columns(tpl_id, final_order);
end;
$$;
