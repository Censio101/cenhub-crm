-- Remove internal demo org seeded in 001 (Meta leads playground).
delete from public.organizations
where slug = 'demo-meta-client';
