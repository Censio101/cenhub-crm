-- Per-funnel column layout when the lead sheet Leadformular filter selects this webhook.

alter table public.lead_funnels
  add column if not exists sheet_column_profile text;

alter table public.lead_funnels
  drop constraint if exists lead_funnels_sheet_column_profile_check;

alter table public.lead_funnels
  add constraint lead_funnels_sheet_column_profile_check check (
    sheet_column_profile is null
    or sheet_column_profile in ('full', 'targets_and_pipeline')
  );

comment on column public.lead_funnels.sheet_column_profile is
  'Lead sheet columns when filtered by this form: null/full = entire template; targets_and_pipeline = webhook targets + pipeline builtins.';

update public.lead_funnels f
set sheet_column_profile = 'targets_and_pipeline'
from public.organizations o
where f.organization_id = o.id
  and o.slug = 'scantherm-aps'
  and f.slug = 'quick-heat-trailer-b2b';
