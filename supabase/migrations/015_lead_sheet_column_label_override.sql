alter table public.lead_sheet_template_columns
  add column if not exists label_override text;
