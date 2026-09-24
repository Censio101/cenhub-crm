-- Client onboarding applications + organization contact fields

alter table public.organizations
  add column if not exists cvr text,
  add column if not exists address text,
  add column if not exists zip_code text,
  add column if not exists city text,
  add column if not exists country text not null default 'DK',
  add column if not exists primary_contact_name text,
  add column if not exists primary_contact_email text,
  add column if not exists primary_contact_phone text,
  add column if not exists website_url text;

create table if not exists public.onboarding_applications (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  source text not null default 'public_form'
    check (source in ('public_form', 'admin_manual')),
  submitted_at timestamptz not null default now(),
  company_name text not null,
  cvr text,
  contact_full_name text not null,
  contact_email text not null,
  contact_phone text not null,
  address text not null,
  zip_code text not null,
  city text not null,
  country text not null default 'DK',
  website_url text,
  consent_given boolean not null default false,
  notes text,
  rejection_reason text,
  organization_id uuid references public.organizations (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  submitter_ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists onboarding_applications_status_idx
  on public.onboarding_applications (status, created_at desc);

create index if not exists onboarding_applications_email_idx
  on public.onboarding_applications (lower(contact_email));

create trigger onboarding_applications_updated_at
  before update on public.onboarding_applications
  for each row execute function public.set_updated_at();

alter table public.onboarding_applications enable row level security;

-- No policies: accessed via service role in API routes only.
