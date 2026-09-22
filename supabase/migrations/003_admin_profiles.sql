-- Admin profile management policies for Phase 3

create policy profiles_insert_admin on public.profiles
  for insert
  with check (public.is_censio_admin());

create policy profiles_admin_manage on public.profiles
  for update
  using (public.is_censio_admin());
