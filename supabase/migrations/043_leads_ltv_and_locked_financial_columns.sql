-- LTV on leads (summed on the dashboard like sales price and profit).
alter table public.leads
  add column if not exists ltv numeric;

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
      'salesPrice',
      'profit',
      'ltv'
    )
  );

-- Every template must include LTV (and re-add financial columns if an old template dropped them).
insert into public.lead_sheet_template_columns (template_id, sort_index, kind, builtin_key)
select
  t.id,
  coalesce(
    (select max(c.sort_index) from public.lead_sheet_template_columns c where c.template_id = t.id),
    -1
  ) + row_number() over (partition by t.id order by v.key),
  'builtin',
  v.key
from public.lead_sheet_templates t
cross join (
  values ('salesPrice'), ('profit'), ('ltv')
) as v(key)
where not exists (
  select 1
  from public.lead_sheet_template_columns c
  where c.template_id = t.id
    and c.kind = 'builtin'
    and c.builtin_key = v.key
);
