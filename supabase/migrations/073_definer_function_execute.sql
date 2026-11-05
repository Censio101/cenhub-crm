-- RLS policies call these as the signed-in user, so authenticated keeps EXECUTE.
-- Anonymous callers do not.

revoke execute on function public.current_organization_id() from public, anon;
revoke execute on function public.is_censio_admin() from public, anon;
revoke execute on function public.can_delete_org_leads(uuid) from public, anon;

grant execute on function public.current_organization_id() to authenticated, service_role;
grant execute on function public.is_censio_admin() to authenticated, service_role;
grant execute on function public.can_delete_org_leads(uuid) to authenticated, service_role;
