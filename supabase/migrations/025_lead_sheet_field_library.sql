-- Lead sheet field library.
--   1) Custom fields become global (one row per field key) instead of belonging to a template.
--   2) Templates only pick fields; a column can be hidden from the client dashboard.
--   3) Built-in fields get a library-level label (renamed once, applies everywhere).
--   4) Each client can hide more columns from its own dashboard.
-- The app is not live yet, so every template except the Standard one is removed and rebuilt.

-- Keep labels that were set on the Standard template's built-in columns.
create table public.lead_sheet_builtin_labels (
  builtin_key text primary key check (
    builtin_key in (
      'date', 'fullName', 'email', 'phone', 'segment', 'companyName', 'address',
      'zipCode', 'city', 'serviceIds', 'metaAdId', 'status', 'salesPrice', 'profit'
    )
  ),
  label text not null check (length(btrim(label)) > 0),
  updated_at timestamptz not null default now()
);

insert into public.lead_sheet_builtin_labels (builtin_key, label)
select c.builtin_key, btrim(c.label_override)
from public.lead_sheet_template_columns c
join public.lead_sheet_templates t on t.id = c.template_id
where t.is_system_default
  and c.kind = 'builtin'
  and c.label_override is not null
  and length(btrim(c.label_override)) > 0
on conflict (builtin_key) do nothing;

create trigger lead_sheet_builtin_labels_set_updated_at
  before update on public.lead_sheet_builtin_labels
  for each row execute function public.set_updated_at();

alter table public.lead_sheet_builtin_labels enable row level security;
create policy lead_sheet_builtin_labels_read on public.lead_sheet_builtin_labels
  for select using (true);
create policy lead_sheet_builtin_labels_admin on public.lead_sheet_builtin_labels
  for all using (public.is_censio_admin());

-- Reset: only the Standard template survives (clients on removed sheets fall back to it).
delete from public.lead_sheet_templates where not is_system_default;
delete from public.lead_sheet_custom_fields;

-- Global custom fields.
drop policy if exists lead_sheet_custom_fields_read on public.lead_sheet_custom_fields;
alter table public.lead_sheet_custom_fields drop column template_id;
alter table public.lead_sheet_custom_fields
  add constraint lead_sheet_custom_fields_field_key_key unique (field_key);
alter table public.lead_sheet_custom_fields
  add constraint lead_sheet_custom_fields_key_not_reserved check (
    field_key not in ('date', 'email', 'phone', 'segment', 'address', 'city', 'status', 'profit', 'platform')
  );
create policy lead_sheet_custom_fields_read on public.lead_sheet_custom_fields
  for select using (true);

-- Templates: no per-template rename, but a per-field "hide from client dashboard" flag.
alter table public.lead_sheet_template_columns drop column if exists label_override;
alter table public.lead_sheet_template_columns
  add column if not exists hidden_for_client boolean not null default false;

-- Clients: extra columns hidden from that client's dashboard ("builtin:email", "custom:budget").
alter table public.organizations
  add column if not exists hidden_column_keys text[] not null default '{}';
