-- Which field names a webhook expects, chosen by the admin and kept until changed:
--   'ours' = the sender uses our field names (any saved mapping is ignored),
--   'own'  = the sender (the funnel page) uses its own names, so the saved mapping applies.
-- Switching between them never deletes the saved sample or mapping.
alter table public.lead_funnels
  add column if not exists data_format text not null default 'ours'
    check (data_format in ('ours', 'own'));

-- Webhooks that already have a mapping or a sample keep working as before.
update public.lead_funnels
set data_format = 'own'
where field_mapping <> '{}'::jsonb
   or sample_payload is not null
   or sample_listening_until is not null;
