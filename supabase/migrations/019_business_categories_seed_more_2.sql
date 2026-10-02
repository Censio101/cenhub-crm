insert into public.business_categories (slug, name_da, name_en, sort_index)
values
  ('painting', 'Maler', 'Painting', 5),
  ('cleaning', 'Rengøring', 'Cleaning', 6)
on conflict (slug) do nothing;
