-- Security: a signed-in client user could change their own profile row without limit, including
-- `role` (become a Censio admin) and `organization_id` (join another client), because the
-- profiles_update_own policy has no column restriction and signed-in users may update any column.
--
-- Fix: only a Censio admin, or server-side code (service role / SQL editor, which has no
-- auth.uid()), may change role, organization or email on a profile. Name, avatar and language
-- stay editable by the user.

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_censio_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.organization_id is distinct from old.organization_id
     or new.email is distinct from old.email then
    raise exception 'Changing role, organization or email on a profile is not allowed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- Make the "row must stay in the same client" rule explicit on every write policy.
alter policy profiles_update_own on public.profiles
  using (id = auth.uid() or public.is_censio_admin())
  with check (id = auth.uid() or public.is_censio_admin());

alter policy leads_update on public.leads
  using (public.is_censio_admin() or organization_id = public.current_organization_id())
  with check (public.is_censio_admin() or organization_id = public.current_organization_id());

alter policy customers_write on public.customers
  using (public.is_censio_admin() or organization_id = public.current_organization_id())
  with check (public.is_censio_admin() or organization_id = public.current_organization_id());
