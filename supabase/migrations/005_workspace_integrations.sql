create table if not exists public.censio_workspace_settings (
  id text primary key default 'default' check (id = 'default'),
  mailgun_api_key text,
  mailgun_domain text,
  mailgun_api_base text,
  mail_from text,
  mail_from_name text,
  site_url text,
  auth_callback_path text not null default '/auth/callback',
  contact_form_url text,
  updated_at timestamptz not null default now()
);

alter table public.censio_workspace_settings enable row level security;

insert into public.censio_workspace_settings (id)
values ('default')
on conflict (id) do nothing;
