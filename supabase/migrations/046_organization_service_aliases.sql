-- External labels (webhooks, import cells) mapped to a client's enabled services.

create table public.organization_service_aliases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  alias text not null check (char_length(trim(alias)) > 0 and char_length(alias) <= 160),
  alias_normalized text not null,
  service_id uuid not null references public.services (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint organization_service_aliases_org_norm_unique unique (organization_id, alias_normalized)
);

create index organization_service_aliases_org_idx
  on public.organization_service_aliases (organization_id);

alter table public.organization_service_aliases enable row level security;
