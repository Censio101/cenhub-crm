-- Roles: only a client admin (or a Censio admin) may delete leads. A client user can see leads and
-- fill in the figures that do not come from the webhook (status, sales price, profit, ...), but
-- cannot delete them. This is enforced here in the database as well as in the API and the UI.

create or replace function public.can_delete_org_leads(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_censio_admin()
    or coalesce(
      (select role = 'client_admin' and organization_id = org
         from public.profiles
        where id = auth.uid()),
      false
    );
$$;

drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads
  for delete using (public.can_delete_org_leads(organization_id));

-- Customer rows are derived from won leads and are written by the server only (the app keeps them
-- in sync when a lead is won or un-won). Clients may read them but never write them directly.
drop policy if exists customers_write on public.customers;
create policy customers_admin_write on public.customers
  for all
  using (public.is_censio_admin())
  with check (public.is_censio_admin());
