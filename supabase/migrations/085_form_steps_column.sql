-- The Form steps column can be shown without a shared total. Templates that already
-- have a step total stay on, so their column and partial-step behavior do not change.
alter table public.lead_sheet_templates
  add column if not exists form_steps_column boolean not null default false;

update public.lead_sheet_templates
set form_steps_column = true
where form_steps_total is not null
  and form_steps_column = false;
