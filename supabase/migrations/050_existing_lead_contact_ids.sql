-- Resolve lead id for import duplicate merge (same keys as existing_lead_contact_keys).

create or replace function public.existing_lead_contact_ids(
  p_org_id uuid,
  p_emails text[],
  p_phones text[]
)
returns table (kind text, key text, lead_id uuid)
language sql
stable
as $$
  select distinct on (kind, key) kind, key, lead_id
  from (
    select 'email'::text as kind, lower(btrim(l.email)) as key, l.id as lead_id
    from public.leads l
    where l.organization_id = p_org_id
      and l.email <> ''
      and lower(btrim(l.email)) = any (p_emails)
    union all
    select 'phone'::text as kind, right(regexp_replace(l.phone, '\D', '', 'g'), 8) as key, l.id as lead_id
    from public.leads l
    where l.organization_id = p_org_id
      and l.phone <> ''
      and right(regexp_replace(l.phone, '\D', '', 'g'), 8) = any (p_phones)
  ) matches
  order by kind, key, lead_id;
$$;

revoke execute on function public.existing_lead_contact_ids(uuid, text[], text[])
  from public, anon, authenticated;
grant execute on function public.existing_lead_contact_ids(uuid, text[], text[]) to service_role;
