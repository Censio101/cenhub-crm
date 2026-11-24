-- Partial steps and the Form steps column are two separate switches on a lead sheet template.
-- Partial steps: the form can post a lead before it is finished and later calls fill the same row.
-- Form steps column: whether the column is shown on the sheet (a shared step total is optional).
alter table public.lead_sheet_templates
  add column if not exists form_partial_steps boolean not null default false;

-- Templates that already track steps keep both on: an existing step total, or the single
-- "steps column" switch that meant both until now.
update public.lead_sheet_templates
set form_partial_steps = true
where form_partial_steps = false
  and (form_steps_total is not null or form_steps_column = true);

update public.lead_sheet_templates
set form_steps_column = true
where form_steps_column = false
  and form_steps_total is not null;
