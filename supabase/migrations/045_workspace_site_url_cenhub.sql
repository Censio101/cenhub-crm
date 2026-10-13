-- Point stored invite/login links at the Cenhub production domain (emails use censio_workspace_settings.site_url).
update public.censio_workspace_settings
set
  site_url = 'https://www.cenhub.dk',
  updated_at = now()
where id = 'default'
  and (
    site_url is null
    or site_url ~* 'vercel\.app'
    or site_url ~* 'crm\.censio'
    or site_url ~* 'cenhub-crm'
  );
