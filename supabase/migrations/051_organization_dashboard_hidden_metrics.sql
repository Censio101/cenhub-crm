-- Dashboard KPIs a Censio admin has hidden for this client (only POAS / "profit" is hideable today).
alter table public.organizations
  add column if not exists dashboard_hidden_metrics text[] not null default '{}';
