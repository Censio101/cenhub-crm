-- Services are opt-in per client: a row means the service is selected for that client.
-- Categories only suggest services (category_services); nothing is added automatically.

delete from public.organization_services where mode = 'hidden';

alter table public.organization_services drop column if exists mode;
