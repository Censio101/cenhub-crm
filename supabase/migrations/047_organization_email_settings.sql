-- Per-client lead notification email (Mailgun, recipients, funnel selection, templates).

create table public.organization_email_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  lead_notify_enabled boolean not null default false,
  mailgun_api_key text,
  mailgun_domain text,
  mailgun_api_base text,
  mail_from text,
  mail_from_name text,
  use_primary_contact boolean not null default true,
  extra_notify_emails text,
  notify_subject_template text,
  notify_intro_template text,
  notify_closing_template text,
  notify_included_column_keys jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_notify_funnels (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  funnel_id uuid not null references public.lead_funnels (id) on delete cascade,
  primary key (organization_id, funnel_id)
);

create index organization_notify_funnels_funnel_id_idx
  on public.organization_notify_funnels (funnel_id);

alter table public.organization_email_settings enable row level security;
alter table public.organization_notify_funnels enable row level security;

create policy organization_email_settings_admin on public.organization_email_settings
  for all using (public.is_censio_admin());

create policy organization_notify_funnels_admin on public.organization_notify_funnels
  for all using (public.is_censio_admin());

create trigger organization_email_settings_updated_at
  before update on public.organization_email_settings
  for each row execute function public.set_updated_at();
