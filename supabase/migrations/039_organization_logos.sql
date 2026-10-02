-- Per-organization header logos (public bucket; path stored in organizations.logo_url)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-logos',
  'organization-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy organization_logos_org_insert on storage.objects
for insert
with check (
  bucket_id = 'organization-logos'
  and (
    public.is_censio_admin()
    or (
      (storage.foldername(name))[1] = public.current_organization_id()::text
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'client_admin'
          and p.organization_id = public.current_organization_id()
      )
    )
  )
);

create policy organization_logos_org_update on storage.objects
for update
using (
  bucket_id = 'organization-logos'
  and (
    public.is_censio_admin()
    or (
      (storage.foldername(name))[1] = public.current_organization_id()::text
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'client_admin'
          and p.organization_id = public.current_organization_id()
      )
    )
  )
);

create policy organization_logos_org_delete on storage.objects
for delete
using (
  bucket_id = 'organization-logos'
  and (
    public.is_censio_admin()
    or (
      (storage.foldername(name))[1] = public.current_organization_id()::text
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'client_admin'
          and p.organization_id = public.current_organization_id()
      )
    )
  )
);

-- Demo org keeps the bundled SVG until a custom logo is uploaded.
update public.organizations
set logo_url = '/nordkystens-tomrer-logo.svg'
where slug = 'nordkystens-tomrer'
  and logo_url is null;
