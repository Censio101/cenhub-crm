-- Tie each lead to the webhook (funnel) that created it, with a stable Danish label for the sheet filter.

alter table public.lead_funnels
  add column if not exists sheet_source_label text;

comment on column public.lead_funnels.sheet_source_label is
  'Short label shown in the lead sheet Form filter (e.g. Beregningsskema, Quick-Heat Trailer).';

alter table public.leads
  add column if not exists lead_funnel_id uuid references public.lead_funnels (id) on delete set null;

alter table public.leads
  add column if not exists funnel_source_label text;

create index if not exists leads_org_funnel_source_label_idx
  on public.leads (organization_id, funnel_source_label)
  where funnel_source_label is not null;

-- Scantherm: tag existing rows as the calculation form (Beregningsskema webhook).
update public.lead_funnels f
set sheet_source_label = 'Beregning'
from public.organizations o
where f.organization_id = o.id
  and o.slug = 'scantherm-aps'
  and f.slug = 'beregningsskema'
  and (f.sheet_source_label is null or f.sheet_source_label = '');

update public.lead_funnels f
set sheet_source_label = 'Quick-Heat Trailer'
from public.organizations o
where f.organization_id = o.id
  and o.slug = 'scantherm-aps'
  and f.slug = 'quick-heat-trailer-b2b'
  and (f.sheet_source_label is null or f.sheet_source_label = '');

update public.leads l
set
  lead_funnel_id = f.id,
  funnel_source_label = coalesce(f.sheet_source_label, f.name)
from public.lead_funnels f
inner join public.organizations o on o.id = f.organization_id
where l.organization_id = o.id
  and o.slug = 'scantherm-aps'
  and f.slug = 'beregningsskema'
  and l.lead_funnel_id is null;
