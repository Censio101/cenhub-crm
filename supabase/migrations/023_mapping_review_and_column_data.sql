-- 1) When a client's lead sheet last changed (assignment, columns, options, required).
--    Meta form mappings older than this need a review.
alter table public.organizations
  add column if not exists lead_sheet_changed_at timestamptz;

-- 2) When a Meta form's field mapping was last saved or explicitly kept as is.
alter table public.meta_lead_forms
  add column if not exists mapping_reviewed_at timestamptz;

-- Existing mappings count as reviewed today, so nothing is flagged until the next sheet change.
update public.meta_lead_forms
set mapping_reviewed_at = now()
where mapping_reviewed_at is null
  and field_mapping <> '{}'::jsonb;

-- 3) Removes a custom column's saved values from the leads of the given clients.
--    Returns the number of leads that were changed.
create or replace function public.remove_custom_field_values(
  p_org_ids uuid[],
  p_key text
)
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  update public.leads
  set custom_fields = custom_fields - p_key
  where organization_id = any (p_org_ids)
    and jsonb_exists(custom_fields, p_key);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.remove_custom_field_values(uuid[], text)
  from public, anon, authenticated;
grant execute on function public.remove_custom_field_values(uuid[], text) to service_role;
