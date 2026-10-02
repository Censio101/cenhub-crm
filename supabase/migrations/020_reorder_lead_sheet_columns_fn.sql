-- Renumbers all columns of a template in one round trip.
-- (template_id, sort_index) is a non-deferrable unique constraint, so rows are first
-- moved to a disjoint negative range, then given their final positions.
create or replace function public.reorder_lead_sheet_template_columns(
  p_template_id uuid,
  p_ordered_ids uuid[]
)
returns void
language plpgsql
as $$
begin
  update public.lead_sheet_template_columns
  set sort_index = -sort_index - 1
  where template_id = p_template_id;

  update public.lead_sheet_template_columns c
  set sort_index = o.ord - 1
  from unnest(p_ordered_ids) with ordinality as o(id, ord)
  where c.id = o.id
    and c.template_id = p_template_id;
end;
$$;

revoke execute on function public.reorder_lead_sheet_template_columns(uuid, uuid[])
  from public, anon, authenticated;
