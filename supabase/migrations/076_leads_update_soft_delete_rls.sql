-- Allow client updates on active rows; WITH CHECK permits setting deleted_at (new row is hidden by SELECT).

drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads
  for update using (
    public.is_censio_admin()
    or (
      organization_id = public.current_organization_id()
      and deleted_at is null
    )
  )
  with check (
    public.is_censio_admin()
    or organization_id = public.current_organization_id()
  );

create or replace function public.soft_delete_lead(p_lead_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
begin
  select organization_id into org from public.leads where id = p_lead_id and deleted_at is null;
  if org is null then
    raise exception 'Lead not found';
  end if;
  if not public.can_delete_org_leads(org) then
    raise exception 'forbidden';
  end if;
  update public.leads
  set deleted_at = now(), deleted_by = auth.uid()
  where id = p_lead_id and deleted_at is null;
end;
$$;

revoke execute on function public.soft_delete_lead(uuid) from public, anon;
grant execute on function public.soft_delete_lead(uuid) to authenticated, service_role;
