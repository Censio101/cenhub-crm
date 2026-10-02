-- Lead sheet templates: industry tags at category level (not subcategories).

create table if not exists public.lead_sheet_template_categories (
  template_id uuid not null references public.lead_sheet_templates (id) on delete cascade,
  category_id uuid not null references public.business_categories (id) on delete cascade,
  primary key (template_id, category_id)
);

alter table public.lead_sheet_template_categories enable row level security;

create policy lead_sheet_template_categories_read on public.lead_sheet_template_categories for select using (
  public.is_censio_admin() or true
);

create policy lead_sheet_template_categories_admin on public.lead_sheet_template_categories for all using (
  public.is_censio_admin()
);

-- Backfill from legacy subcategory links (one tag per parent category).
insert into public.lead_sheet_template_categories (template_id, category_id)
select distinct tts.template_id, bs.category_id
from public.lead_sheet_template_subcategories tts
inner join public.business_subcategories bs on bs.id = tts.subcategory_id
on conflict do nothing;
