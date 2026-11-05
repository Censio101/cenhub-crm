-- Lead audit trail + soft delete (rows stay recoverable; clients do not see deleted leads).

alter table public.leads
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users (id) on delete set null;

create index if not exists leads_org_active_lead_date_idx
  on public.leads (organization_id, lead_date desc, lead_time desc)
  where deleted_at is null;

create table if not exists public.lead_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  action text not null check (
    action in ('created', 'updated', 'soft_deleted', 'restored', 'hard_deleted')
  ),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_role text,
  source text not null default 'api',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index lead_audit_events_org_created_idx
  on public.lead_audit_events (organization_id, created_at desc);

create index lead_audit_events_lead_created_idx
  on public.lead_audit_events (lead_id, created_at desc)
  where lead_id is not null;

alter table public.lead_audit_events enable row level security;

create policy lead_audit_events_select on public.lead_audit_events
  for select using (
    public.is_censio_admin()
    or organization_id = public.current_organization_id()
  );

create policy lead_audit_events_insert on public.lead_audit_events
  for insert with check (
    public.is_censio_admin()
    or organization_id = public.current_organization_id()
  );

-- Active leads only for client sessions; Censio admin sees all rows (including trash).
drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select using (
  public.is_censio_admin()
  or (
    organization_id = public.current_organization_id()
    and deleted_at is null
  )
);

-- Soft delete: client admins update deleted_at (not hard DELETE from the app).
drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads
  for delete using (public.is_censio_admin());
