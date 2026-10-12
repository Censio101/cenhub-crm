-- Won date: when status became won (separate from lead_date / intake).
alter table public.leads
  add column if not exists won_date date;

alter table public.lead_sheet_template_columns
  drop constraint if exists lead_sheet_template_columns_builtin_key_check;

alter table public.lead_sheet_template_columns
  add constraint lead_sheet_template_columns_builtin_key_check check (
    builtin_key is null
    or builtin_key in (
      'date',
      'fullName',
      'email',
      'phone',
      'segment',
      'companyName',
      'address',
      'zipCode',
      'city',
      'serviceIds',
      'metaAdId',
      'status',
      'wonDate',
      'salesPrice',
      'profit',
      'ltv'
    )
  );

insert into public.lead_sheet_template_columns (template_id, sort_index, kind, builtin_key)
select
  t.id,
  coalesce(
    (select max(c.sort_index) from public.lead_sheet_template_columns c where c.template_id = t.id),
    -1
  ) + 1,
  'builtin',
  'wonDate'
from public.lead_sheet_templates t
where not exists (
  select 1
  from public.lead_sheet_template_columns c
  where c.template_id = t.id
    and c.kind = 'builtin'
    and c.builtin_key = 'wonDate'
);

update public.leads
set won_date = lead_date
where status = 'won' and won_date is null;

update public.customers cu
set closed_date = l.won_date
from public.leads l
where cu.lead_id = l.id
  and l.status = 'won'
  and l.won_date is not null
  and cu.closed_date is distinct from l.won_date;
