-- Per column on a lead sheet template: show a multi-line text field as a formatted list
-- (bold labels on the left, values on the right) when it holds "Label: value" lines.
-- Off by default, so every existing column looks exactly as before until someone turns it on.
alter table public.lead_sheet_template_columns
  add column if not exists formatted_view boolean not null default false;
