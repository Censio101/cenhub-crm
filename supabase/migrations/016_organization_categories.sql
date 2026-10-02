create table public.organization_categories (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category_id uuid not null references public.business_categories (id) on delete cascade,
  primary key (organization_id, category_id)
);

alter table public.organization_categories enable row level security;

create policy organization_categories_read on public.organization_categories for select using (
  public.is_censio_admin() or organization_id = public.current_organization_id()
);

create policy organization_categories_admin on public.organization_categories for all using (
  public.is_censio_admin()
);
