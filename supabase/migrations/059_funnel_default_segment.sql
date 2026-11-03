-- B2B vs B2C webhooks: default segment when the payload does not send one.
alter table public.lead_funnels
  add column if not exists default_segment text;

alter table public.lead_funnels
  drop constraint if exists lead_funnels_default_segment_check;

alter table public.lead_funnels
  add constraint lead_funnels_default_segment_check
  check (default_segment is null or default_segment in ('b2b', 'b2c'));

comment on column public.lead_funnels.default_segment is
  'When set, new leads from this webhook get this segment if the payload omits segment.';
