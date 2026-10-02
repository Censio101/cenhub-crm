-- Extra industry categories for admin UI testing (template tag picker scroll, filters).
insert into public.business_categories (slug, name_da, name_en, sort_index)
values
  ('electrical', 'Elektriker', 'Electrical', 2),
  ('landscaping', 'Havepleje', 'Landscaping', 3),
  ('heat-pumps', 'Varmepumper', 'Heat pumps', 4)
on conflict (slug) do nothing;
