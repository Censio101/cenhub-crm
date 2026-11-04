-- Scantherm: Platform (utm_source) was in the client hidden-column list, so it never appeared
-- on the dashboard — including Quick-Heat’s compact Leadformular view.

update public.organizations
set hidden_column_keys = array_remove(hidden_column_keys, 'custom:utm_source')
where slug = 'scantherm-aps'
  and 'custom:utm_source' = any (hidden_column_keys);
