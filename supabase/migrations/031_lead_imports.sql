-- Importing old client sheets (Excel / CSV): every import is recorded so it can be undone.
create table if not exists public.lead_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  file_name text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  total_rows integer not null default 0,
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  warning_count integer not null default 0,
  status text not null default 'running' check (status in ('running', 'done', 'undone')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists lead_imports_org_created_idx
  on public.lead_imports (organization_id, created_at desc);

-- Server only (service role). No client should read import batches directly.
alter table public.lead_imports enable row level security;

-- Which import created a lead (null for every other lead). Deleting the batch keeps the leads.
alter table public.leads
  add column if not exists import_id uuid references public.lead_imports (id) on delete set null;

create index if not exists leads_import_id_idx on public.leads (import_id) where import_id is not null;

alter table public.leads drop constraint if exists leads_source_check;
alter table public.leads
  add constraint leads_source_check
  check (source in ('demo', 'meta', 'website', 'landing', 'manual', 'import'));

-- Duplicate check for imports: are these emails / phone numbers already leads of this client?
-- Email compares lower-cased and trimmed; phone compares the last 8 digits (so "+45 12 34 56 78"
-- and "12345678" match). Both are indexed.
create index if not exists leads_org_email_key_idx
  on public.leads (organization_id, lower(btrim(email)))
  where email <> '';
create index if not exists leads_org_phone_key_idx
  on public.leads (organization_id, right(regexp_replace(phone, '\D', '', 'g'), 8))
  where phone <> '';

create or replace function public.existing_lead_contact_keys(
  p_org_id uuid,
  p_emails text[],
  p_phones text[]
)
returns table (kind text, key text)
language sql
stable
as $$
  select distinct 'email'::text as kind, lower(btrim(l.email)) as key
  from public.leads l
  where l.organization_id = p_org_id
    and l.email <> ''
    and lower(btrim(l.email)) = any (p_emails)
  union
  select distinct 'phone'::text as kind, right(regexp_replace(l.phone, '\D', '', 'g'), 8) as key
  from public.leads l
  where l.organization_id = p_org_id
    and l.phone <> ''
    and right(regexp_replace(l.phone, '\D', '', 'g'), 8) = any (p_phones);
$$;

revoke execute on function public.existing_lead_contact_keys(uuid, text[], text[])
  from public, anon, authenticated;
grant execute on function public.existing_lead_contact_keys(uuid, text[], text[]) to service_role;
