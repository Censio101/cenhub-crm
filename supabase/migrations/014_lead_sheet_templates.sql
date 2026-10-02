-- Lead sheet templates, business categories, custom lead fields

alter table public.leads
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

create table public.business_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,64}$'),
  name_da text not null,
  name_en text not null,
  sort_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.business_categories (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{2,64}$'),
  name_da text not null,
  name_en text not null,
  sort_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);

create index business_subcategories_category_idx on public.business_subcategories (category_id);

create table public.lead_sheet_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  is_system_default boolean not null default false,
  is_shared boolean not null default true,
  source_template_id uuid references public.lead_sheet_templates (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_sheet_templates_one_default check (
    not is_system_default or is_system_default = true
  )
);

create unique index lead_sheet_templates_one_system_default_idx
  on public.lead_sheet_templates (is_system_default)
  where is_system_default = true;

create index lead_sheet_templates_organization_idx on public.lead_sheet_templates (organization_id);

alter table public.organizations
  add column if not exists lead_sheet_template_id uuid references public.lead_sheet_templates (id) on delete set null;

create table public.lead_sheet_custom_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.lead_sheet_templates (id) on delete cascade,
  field_key text not null check (field_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  label text not null,
  field_type text not null check (
    field_type in ('text', 'textarea', 'date', 'time', 'number', 'select', 'image')
  ),
  required boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, field_key)
);

create table public.lead_sheet_template_columns (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.lead_sheet_templates (id) on delete cascade,
  sort_index integer not null,
  kind text not null,
  builtin_key text check (
    builtin_key is null
    or builtin_key in (
      'date',
      'fullName',
      'email',
      'phone',
      'segment',
      'companyName',
      'address',
      'zipCode',
      'city',
      'serviceIds',
      'metaAdId',
      'status',
      'salesPrice',
      'profit'
    )
  ),
  custom_field_id uuid references public.lead_sheet_custom_fields (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint lead_sheet_template_columns_kind_values check (kind in ('builtin', 'custom')),
  constraint lead_sheet_template_columns_kind_shape check (
    (kind = 'builtin' and builtin_key is not null and custom_field_id is null)
    or (kind = 'custom' and custom_field_id is not null and builtin_key is null)
  ),
  unique (template_id, sort_index),
  unique (template_id, builtin_key),
  unique (template_id, custom_field_id)
);

create index lead_sheet_template_columns_template_idx
  on public.lead_sheet_template_columns (template_id, sort_index);

create table public.lead_sheet_template_subcategories (
  template_id uuid not null references public.lead_sheet_templates (id) on delete cascade,
  subcategory_id uuid not null references public.business_subcategories (id) on delete cascade,
  primary key (template_id, subcategory_id)
);

create table public.organization_subcategories (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subcategory_id uuid not null references public.business_subcategories (id) on delete cascade,
  primary key (organization_id, subcategory_id)
);

create trigger business_categories_set_updated_at
  before update on public.business_categories
  for each row execute function public.set_updated_at();

create trigger business_subcategories_set_updated_at
  before update on public.business_subcategories
  for each row execute function public.set_updated_at();

create trigger lead_sheet_templates_set_updated_at
  before update on public.lead_sheet_templates
  for each row execute function public.set_updated_at();

create trigger lead_sheet_custom_fields_set_updated_at
  before update on public.lead_sheet_custom_fields
  for each row execute function public.set_updated_at();

alter table public.business_categories enable row level security;
alter table public.business_subcategories enable row level security;
alter table public.lead_sheet_templates enable row level security;
alter table public.lead_sheet_custom_fields enable row level security;
alter table public.lead_sheet_template_columns enable row level security;
alter table public.lead_sheet_template_subcategories enable row level security;
alter table public.organization_subcategories enable row level security;

create policy business_categories_read on public.business_categories for select using (true);
create policy business_categories_admin on public.business_categories for all using (
  public.is_censio_admin()
);

create policy business_subcategories_read on public.business_subcategories for select using (true);
create policy business_subcategories_admin on public.business_subcategories for all using (
  public.is_censio_admin()
);

create policy lead_sheet_templates_read on public.lead_sheet_templates for select using (
  public.is_censio_admin()
  or organization_id = public.current_organization_id()
  or (is_shared = true and organization_id is null)
  or is_system_default = true
);

create policy lead_sheet_templates_admin on public.lead_sheet_templates for all using (
  public.is_censio_admin()
);

create policy lead_sheet_custom_fields_read on public.lead_sheet_custom_fields for select using (
  public.is_censio_admin()
  or exists (
    select 1
    from public.lead_sheet_templates t
    where t.id = template_id
      and (
        t.organization_id = public.current_organization_id()
        or t.is_system_default
        or (t.is_shared and t.organization_id is null)
      )
  )
);

create policy lead_sheet_custom_fields_admin on public.lead_sheet_custom_fields for all using (
  public.is_censio_admin()
);

create policy lead_sheet_template_columns_read on public.lead_sheet_template_columns for select using (
  public.is_censio_admin()
  or exists (
    select 1
    from public.lead_sheet_templates t
    where t.id = template_id
      and (
        t.organization_id = public.current_organization_id()
        or t.is_system_default
        or (t.is_shared and t.organization_id is null)
      )
  )
);

create policy lead_sheet_template_columns_admin on public.lead_sheet_template_columns for all using (
  public.is_censio_admin()
);

create policy lead_sheet_template_subcategories_read on public.lead_sheet_template_subcategories for select using (
  public.is_censio_admin() or true
);

create policy lead_sheet_template_subcategories_admin on public.lead_sheet_template_subcategories for all using (
  public.is_censio_admin()
);

create policy organization_subcategories_read on public.organization_subcategories for select using (
  public.is_censio_admin() or organization_id = public.current_organization_id()
);

create policy organization_subcategories_admin on public.organization_subcategories for all using (
  public.is_censio_admin()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-sheet-files',
  'lead-sheet-files',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy lead_sheet_files_org_read on storage.objects for select using (
  bucket_id = 'lead-sheet-files'
  and (
    public.is_censio_admin()
    or (storage.foldername(name))[1] = public.current_organization_id()::text
  )
);

create policy lead_sheet_files_org_insert on storage.objects for insert with check (
  bucket_id = 'lead-sheet-files'
  and (
    public.is_censio_admin()
    or (storage.foldername(name))[1] = public.current_organization_id()::text
  )
);

create policy lead_sheet_files_org_update on storage.objects for update using (
  bucket_id = 'lead-sheet-files'
  and (
    public.is_censio_admin()
    or (storage.foldername(name))[1] = public.current_organization_id()::text
  )
);

create policy lead_sheet_files_org_delete on storage.objects for delete using (
  bucket_id = 'lead-sheet-files'
  and (
    public.is_censio_admin()
    or (storage.foldername(name))[1] = public.current_organization_id()::text
  )
);

-- Seed categories, default template, demo library templates
do $$
declare
  cat_roofing uuid;
  cat_window uuid;
  sub_res_roof uuid;
  sub_comm_roof uuid;
  sub_res_win uuid;
  sub_comm_win uuid;
  tpl_default uuid;
  tpl_roofing uuid;
  tpl_window uuid;
  cf_roof_photo uuid;
  cf_roof_notes uuid;
  cf_win_photo uuid;
  col_id uuid;
  i int;
  builtins text[] := array[
    'date', 'fullName', 'email', 'phone', 'segment', 'companyName', 'address',
    'zipCode', 'city', 'serviceIds', 'metaAdId', 'status', 'salesPrice', 'profit'
  ];
  bk text;
begin
  insert into public.business_categories (slug, name_da, name_en, sort_index)
  values ('roofing', 'Tagdækning', 'Roofing', 0)
  returning id into cat_roofing;

  insert into public.business_categories (slug, name_da, name_en, sort_index)
  values ('window-cleaning', 'Vinduespudsning', 'Window cleaning', 1)
  returning id into cat_window;

  insert into public.business_subcategories (category_id, slug, name_da, name_en, sort_index)
  values (cat_roofing, 'residential-roofing', 'Privat tagdækning', 'Residential roofing', 0)
  returning id into sub_res_roof;

  insert into public.business_subcategories (category_id, slug, name_da, name_en, sort_index)
  values (cat_roofing, 'commercial-roofing', 'Erhverv tagdækning', 'Commercial roofing', 1)
  returning id into sub_comm_roof;

  insert into public.business_subcategories (category_id, slug, name_da, name_en, sort_index)
  values (cat_window, 'residential-windows', 'Privat vinduespudsning', 'Residential window cleaning', 0)
  returning id into sub_res_win;

  insert into public.business_subcategories (category_id, slug, name_da, name_en, sort_index)
  values (cat_window, 'commercial-windows', 'Erhverv vinduespudsning', 'Commercial window cleaning', 1)
  returning id into sub_comm_win;

  insert into public.lead_sheet_templates (name, description, is_system_default, is_shared, organization_id)
  values (
    'Standard lead sheet',
    'Default column layout for all clients.',
    true,
    true,
    null
  )
  returning id into tpl_default;

  i := 0;
  foreach bk in array builtins loop
    insert into public.lead_sheet_template_columns (template_id, sort_index, kind, builtin_key)
    values (tpl_default, i, 'builtin', bk);
    i := i + 1;
  end loop;

  update public.organizations set lead_sheet_template_id = tpl_default where lead_sheet_template_id is null;

  insert into public.lead_sheet_templates (name, description, is_system_default, is_shared, source_template_id)
  values (
    'Roofing — with site photos',
    'Standard sheet plus roof photo and inspection notes.',
    false,
    true,
    tpl_default
  )
  returning id into tpl_roofing;

  insert into public.lead_sheet_custom_fields (template_id, field_key, label, field_type, config)
  values (tpl_roofing, 'roof_photo', 'Roof photo', 'image', '{}'::jsonb)
  returning id into cf_roof_photo;

  insert into public.lead_sheet_custom_fields (template_id, field_key, label, field_type, config)
  values (tpl_roofing, 'inspection_notes', 'Inspection notes', 'textarea', '{}'::jsonb)
  returning id into cf_roof_notes;

  i := 0;
  foreach bk in array builtins loop
    if bk = 'status' then
      insert into public.lead_sheet_template_columns (template_id, sort_index, kind, custom_field_id)
      values (tpl_roofing, i, 'custom', cf_roof_photo);
      i := i + 1;
      insert into public.lead_sheet_template_columns (template_id, sort_index, kind, custom_field_id)
      values (tpl_roofing, i, 'custom', cf_roof_notes);
      i := i + 1;
    end if;
    insert into public.lead_sheet_template_columns (template_id, sort_index, kind, builtin_key)
    values (tpl_roofing, i, 'builtin', bk);
    i := i + 1;
  end loop;

  insert into public.lead_sheet_template_subcategories (template_id, subcategory_id)
  values
    (tpl_roofing, sub_res_roof),
    (tpl_roofing, sub_comm_roof);

  insert into public.lead_sheet_templates (name, description, is_system_default, is_shared, source_template_id)
  values (
    'Window cleaning — job photo',
    'Standard sheet plus before/after photo field.',
    false,
    true,
    tpl_default
  )
  returning id into tpl_window;

  insert into public.lead_sheet_custom_fields (template_id, field_key, label, field_type, config)
  values (tpl_window, 'job_photo', 'Job photo', 'image', '{}'::jsonb)
  returning id into cf_win_photo;

  i := 0;
  foreach bk in array builtins loop
    if bk = 'metaAdId' then
      insert into public.lead_sheet_template_columns (template_id, sort_index, kind, custom_field_id)
      values (tpl_window, i, 'custom', cf_win_photo);
      i := i + 1;
    end if;
    insert into public.lead_sheet_template_columns (template_id, sort_index, kind, builtin_key)
    values (tpl_window, i, 'builtin', bk);
    i := i + 1;
  end loop;

  insert into public.lead_sheet_template_subcategories (template_id, subcategory_id)
  values
    (tpl_window, sub_res_win),
    (tpl_window, sub_comm_win);
end $$;
