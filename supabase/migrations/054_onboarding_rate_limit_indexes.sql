-- The public signup form now limits requests with the database instead of server memory, by
-- counting recent applications per (hashed) IP and in total. These indexes keep that count cheap.

create index if not exists onboarding_applications_ip_recent_idx
  on public.onboarding_applications (submitter_ip_hash, created_at desc);

create index if not exists onboarding_applications_source_recent_idx
  on public.onboarding_applications (source, created_at desc);
