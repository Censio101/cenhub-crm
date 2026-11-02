-- Partial steps: a funnel can send a lead after every step of its form. The lead sheet template
-- sets how many steps the form has; each lead stores how many were completed so far.
alter table public.leads
  add column if not exists form_steps_done smallint;

alter table public.leads
  drop constraint if exists leads_form_steps_done_check;
alter table public.leads
  add constraint leads_form_steps_done_check
  check (form_steps_done is null or form_steps_done >= 0);

-- null = the template has no stepped form; otherwise the total number of steps (2 to 30).
alter table public.lead_sheet_templates
  add column if not exists form_steps_total smallint;

alter table public.lead_sheet_templates
  drop constraint if exists lead_sheet_templates_form_steps_total_check;
alter table public.lead_sheet_templates
  add constraint lead_sheet_templates_form_steps_total_check
  check (form_steps_total is null or form_steps_total between 2 and 30);

-- New built-in column "Form steps" (shown only on templates that set a step total).
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
      'ltv',
      'formProgress'
    )
  );

-- Every template carries every built-in column, so add this one to all existing templates.
insert into public.lead_sheet_template_columns (template_id, sort_index, kind, builtin_key)
select
  t.id,
  coalesce(
    (select max(c.sort_index) from public.lead_sheet_template_columns c where c.template_id = t.id),
    -1
  ) + 1,
  'builtin',
  'formProgress'
from public.lead_sheet_templates t
where not exists (
  select 1
  from public.lead_sheet_template_columns c
  where c.template_id = t.id
    and c.kind = 'builtin'
    and c.builtin_key = 'formProgress'
);
