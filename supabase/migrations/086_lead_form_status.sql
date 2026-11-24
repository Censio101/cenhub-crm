-- Partial submissions without a known step total. A stepped form that cannot say how many steps
-- it has reports "partial" or "complete" instead. Existing leads stay null and keep using
-- form_steps_done, so clients with a step total are unaffected.
alter table public.leads
  add column if not exists form_status text;

alter table public.leads
  drop constraint if exists leads_form_status_check;
alter table public.leads
  add constraint leads_form_status_check
    check (form_status is null or form_status in ('partial', 'complete'));
