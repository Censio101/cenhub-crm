-- Censio Internal — dedikeret datalager (kunder, omsætning, tilbud, brugere m.m.)
-- Kør i Supabase SQL Editor for projektet "Censio Internal".

create extension if not exists "pgcrypto";

-- ─── Tabeller ───────────────────────────────────────────────────────────────

create table if not exists public.ci_workspaces (
  id text primary key,
  name text not null,
  email text not null,
  logo text not null default '',
  profile_image text not null default '',
  enabled_service_ids jsonb not null default '[]'::jsonb,
  custom_services jsonb not null default '[]'::jsonb,
  hvidbjerg_partner boolean not null default false,
  status text not null,
  use_demo_data boolean not null default false,
  created_at timestamptz not null,
  provisioned_at timestamptz
);

create table if not exists public.ci_users (
  id text primary key,
  email text not null,
  name text not null,
  username text not null,
  title text not null default '',
  profile_image text not null default '',
  head_admin boolean not null default false,
  censio_staff_role text,
  password_hash text,
  global_role text not null,
  created_at timestamptz not null
);

create index if not exists ci_users_email_idx on public.ci_users (lower(email));

create table if not exists public.ci_memberships (
  id text primary key,
  workspace_id text not null,
  user_id text not null,
  role text not null,
  status text not null
);

create index if not exists ci_memberships_workspace_idx on public.ci_memberships (workspace_id);
create index if not exists ci_memberships_user_idx on public.ci_memberships (user_id);

create table if not exists public.ci_invites (
  id text primary key,
  token text not null,
  workspace_id text not null,
  user_id text not null,
  email text not null,
  name text not null,
  role text not null,
  kind text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  last_sent_at timestamptz,
  last_invite_url text not null default '',
  mail_sent boolean not null default false
);

create index if not exists ci_invites_token_idx on public.ci_invites (token);

create table if not exists public.ci_sessions (
  id text primary key,
  user_id text not null,
  workspace_id text,
  expires_at timestamptz not null
);

create index if not exists ci_sessions_user_idx on public.ci_sessions (user_id);

create table if not exists public.ci_commercial_lines (
  id text primary key,
  workspace_id text not null,
  category text not null,
  name text not null,
  amount numeric not null,
  cadence text not null,
  starts_on date not null,
  ends_on date,
  note text not null default '',
  billing_periods jsonb not null default '[]'::jsonb
);

create index if not exists ci_commercial_lines_workspace_idx on public.ci_commercial_lines (workspace_id);

create table if not exists public.ci_fixed_expenses (
  id text primary key,
  type text not null,
  name text not null,
  amount numeric not null,
  starts_on date not null,
  ends_on date,
  price_periods jsonb not null default '[]'::jsonb,
  note text not null default '',
  url text not null default ''
);

create table if not exists public.ci_customer_contacts (
  workspace_id text primary key,
  website text not null default '',
  cvr text not null default '',
  phone text not null default '',
  sub_email text not null default '',
  contact_name text not null default '',
  people jsonb not null default '[]'::jsonb
);

create table if not exists public.ci_customer_documents (
  id text primary key,
  workspace_id text not null,
  file_name text not null,
  stored_name text not null,
  uploaded_at timestamptz not null,
  size_bytes integer not null,
  name text not null default '',
  note text not null default ''
);

create index if not exists ci_customer_documents_workspace_idx on public.ci_customer_documents (workspace_id);

create table if not exists public.ci_audit_logs (
  id text primary key,
  at timestamptz not null,
  user_id text not null,
  user_name text not null,
  action text not null,
  target text not null,
  change text not null
);

create index if not exists ci_audit_logs_at_idx on public.ci_audit_logs (at desc);

create table if not exists public.ci_offers (
  id text primary key,
  slug text not null unique,
  status text not null,
  workspace_id text,
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null default '',
  cvr text not null default '',
  packages jsonb not null default '[]'::jsonb,
  public_package_view text not null,
  services jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_via text,
  signature_name text
);

create index if not exists ci_offers_workspace_idx on public.ci_offers (workspace_id);
create index if not exists ci_offers_status_idx on public.ci_offers (status);

create table if not exists public.ci_offer_engagement (
  id text primary key,
  offer_id text not null,
  slug text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  opened boolean not null default false,
  max_scroll_pct numeric not null default 0,
  duration_sec numeric not null default 0
);

create index if not exists ci_offer_engagement_offer_idx on public.ci_offer_engagement (offer_id);

-- Metadata (seed / migration marker)
create table if not exists public.ci_store_meta (
  id text primary key default 'primary',
  seeded_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.ci_store_meta (id, updated_at)
values ('primary', now())
on conflict (id) do nothing;

-- Storage bucket for kundekontrakter (opret også under Storage → New bucket hvis SQL fejler)
insert into storage.buckets (id, name, public, file_size_limit)
values ('censio-internal-contracts', 'censio-internal-contracts', false, 10485760)
on conflict (id) do nothing;

-- ─── Atomisk erstatning af hele internal store (kaldes fra app med service role) ───

create or replace function public.ci_replace_store(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate table
    ci_offer_engagement,
    ci_offers,
    ci_audit_logs,
    ci_customer_documents,
    ci_customer_contacts,
    ci_fixed_expenses,
    ci_commercial_lines,
    ci_sessions,
    ci_invites,
    ci_memberships,
    ci_users,
    ci_workspaces;

  insert into ci_workspaces (
    id, name, email, logo, profile_image, enabled_service_ids, custom_services,
    hvidbjerg_partner, status, use_demo_data, created_at, provisioned_at
  )
  select
    w.id,
    w.name,
    w.email,
    coalesce(w.logo, ''),
    coalesce(w.profile_image, ''),
    coalesce(w.enabled_service_ids, '[]'::jsonb),
    coalesce(w.custom_services, '[]'::jsonb),
    coalesce(w.hvidbjerg_partner, false),
    w.status,
    coalesce(w.use_demo_data, false),
    (w.created_at)::timestamptz,
    nullif(w.provisioned_at, '')::timestamptz
  from jsonb_to_recordset(coalesce(p_payload->'workspaces', '[]'::jsonb)) as w(
    id text,
    name text,
    email text,
    logo text,
    profile_image text,
    enabled_service_ids jsonb,
    custom_services jsonb,
    hvidbjerg_partner boolean,
    status text,
    use_demo_data boolean,
    created_at text,
    provisioned_at text
  );

  insert into ci_users (
    id, email, name, username, title, profile_image, head_admin, censio_staff_role,
    password_hash, global_role, created_at
  )
  select
    u.id,
    u.email,
    u.name,
    u.username,
    coalesce(u.title, ''),
    coalesce(u.profile_image, ''),
    coalesce(u.head_admin, false),
    u.censio_staff_role,
    u.password_hash,
    u.global_role,
    (u.created_at)::timestamptz
  from jsonb_to_recordset(coalesce(p_payload->'users', '[]'::jsonb)) as u(
    id text,
    email text,
    name text,
    username text,
    title text,
    profile_image text,
    head_admin boolean,
    censio_staff_role text,
    password_hash text,
    global_role text,
    created_at text
  );

  insert into ci_memberships (id, workspace_id, user_id, role, status)
  select m.id, m.workspace_id, m.user_id, m.role, m.status
  from jsonb_to_recordset(coalesce(p_payload->'memberships', '[]'::jsonb)) as m(
    id text, workspace_id text, user_id text, role text, status text
  );

  insert into ci_invites (
    id, token, workspace_id, user_id, email, name, role, kind,
    expires_at, used_at, last_sent_at, last_invite_url, mail_sent
  )
  select
    i.id, i.token, i.workspace_id, i.user_id, i.email, i.name, i.role, i.kind,
    (i.expires_at)::timestamptz,
    nullif(i.used_at, '')::timestamptz,
    nullif(i.last_sent_at, '')::timestamptz,
    coalesce(i.last_invite_url, ''),
    coalesce(i.mail_sent, false)
  from jsonb_to_recordset(coalesce(p_payload->'invites', '[]'::jsonb)) as i(
    id text, token text, workspace_id text, user_id text, email text, name text,
    role text, kind text, expires_at text, used_at text, last_sent_at text,
    last_invite_url text, mail_sent boolean
  );

  insert into ci_sessions (id, user_id, workspace_id, expires_at)
  select s.id, s.user_id, s.workspace_id, (s.expires_at)::timestamptz
  from jsonb_to_recordset(coalesce(p_payload->'sessions', '[]'::jsonb)) as s(
    id text, user_id text, workspace_id text, expires_at text
  );

  insert into ci_commercial_lines (
    id, workspace_id, category, name, amount, cadence, starts_on, ends_on, note, billing_periods
  )
  select
    l.id, l.workspace_id, l.category, l.name, l.amount, l.cadence,
    (l.starts_on)::date,
    nullif(l.ends_on, '')::date,
    coalesce(l.note, ''),
    coalesce(l.billing_periods, '[]'::jsonb)
  from jsonb_to_recordset(coalesce(p_payload->'commercialLines', '[]'::jsonb)) as l(
    id text, workspace_id text, category text, name text, amount numeric,
    cadence text, starts_on text, ends_on text, note text, billing_periods jsonb
  );

  insert into ci_fixed_expenses (
    id, type, name, amount, starts_on, ends_on, price_periods, note, url
  )
  select
    e.id, e.type, e.name, e.amount, (e.starts_on)::date, nullif(e.ends_on, '')::date,
    coalesce(e.price_periods, '[]'::jsonb),
    coalesce(e.note, ''), coalesce(e.url, '')
  from jsonb_to_recordset(coalesce(p_payload->'fixedExpenses', '[]'::jsonb)) as e(
    id text, type text, name text, amount numeric, starts_on text, ends_on text,
    price_periods jsonb, note text, url text
  );

  insert into ci_customer_contacts (
    workspace_id, website, cvr, phone, sub_email, contact_name, people
  )
  select
    c.workspace_id,
    coalesce(c.website, ''),
    coalesce(c.cvr, ''),
    coalesce(c.phone, ''),
    coalesce(c.sub_email, ''),
    coalesce(c.contact_name, ''),
    coalesce(c.people, '[]'::jsonb)
  from jsonb_to_recordset(coalesce(p_payload->'customerContacts', '[]'::jsonb)) as c(
    workspace_id text, website text, cvr text, phone text, sub_email text,
    contact_name text, people jsonb
  );

  insert into ci_customer_documents (
    id, workspace_id, file_name, stored_name, uploaded_at, size_bytes, name, note
  )
  select
    d.id, d.workspace_id, d.file_name, d.stored_name, (d.uploaded_at)::timestamptz,
    d.size, coalesce(d.name, ''), coalesce(d.note, '')
  from jsonb_to_recordset(coalesce(p_payload->'customerDocuments', '[]'::jsonb)) as d(
    id text, workspace_id text, file_name text, stored_name text, uploaded_at text,
    size integer, name text, note text
  );

  insert into ci_audit_logs (id, at, user_id, user_name, action, target, change)
  select
    a.id, (a.at)::timestamptz, a.user_id, a.user_name, a.action, a.target, a.change
  from jsonb_to_recordset(coalesce(p_payload->'auditLogs', '[]'::jsonb)) as a(
    id text, at text, user_id text, user_name text, action text, target text, change text
  );

  insert into ci_offers (
    id, slug, status, workspace_id, company_name, contact_name, email, phone, cvr,
    packages, public_package_view, services, created_at, updated_at, sent_at,
    accepted_at, accepted_via, signature_name
  )
  select
    o.id, o.slug, o.status, o.workspace_id, o.company_name, o.contact_name, o.email,
    coalesce(o.phone, ''), coalesce(o.cvr, ''),
    coalesce(o.packages, '[]'::jsonb),
    o.public_package_view,
    coalesce(o.services, '[]'::jsonb),
    (o.created_at)::timestamptz,
    (o.updated_at)::timestamptz,
    nullif(o.sent_at, '')::timestamptz,
    nullif(o.accepted_at, '')::timestamptz,
    o.accepted_via,
    o.signature_name
  from jsonb_to_recordset(coalesce(p_payload->'offers', '[]'::jsonb)) as o(
    id text, slug text, status text, workspace_id text, company_name text,
    contact_name text, email text, phone text, cvr text, packages jsonb,
    public_package_view text, services jsonb, created_at text, updated_at text,
    sent_at text, accepted_at text, accepted_via text, signature_name text
  );

  insert into ci_offer_engagement (
    id, offer_id, slug, started_at, ended_at, opened, max_scroll_pct, duration_sec
  )
  select
    g.id, g.offer_id, g.slug, (g.started_at)::timestamptz, nullif(g.ended_at, '')::timestamptz,
    coalesce(g.opened, false), coalesce(g.max_scroll_pct, 0), coalesce(g.duration_sec, 0)
  from jsonb_to_recordset(coalesce(p_payload->'offerEngagement', '[]'::jsonb)) as g(
    id text, offer_id text, slug text, started_at text, ended_at text,
    opened boolean, max_scroll_pct numeric, duration_sec numeric
  );

  update ci_store_meta set updated_at = now() where id = 'primary';
end;
$$;

revoke all on function public.ci_replace_store(jsonb) from public;
grant execute on function public.ci_replace_store(jsonb) to service_role;

alter table public.ci_workspaces enable row level security;
alter table public.ci_users enable row level security;
alter table public.ci_memberships enable row level security;
alter table public.ci_invites enable row level security;
alter table public.ci_sessions enable row level security;
alter table public.ci_commercial_lines enable row level security;
alter table public.ci_fixed_expenses enable row level security;
alter table public.ci_customer_contacts enable row level security;
alter table public.ci_customer_documents enable row level security;
alter table public.ci_audit_logs enable row level security;
alter table public.ci_offers enable row level security;
alter table public.ci_offer_engagement enable row level security;
alter table public.ci_store_meta enable row level security;

-- Kun server (service role) må læse/skrive; ingen anon/ad policies.
