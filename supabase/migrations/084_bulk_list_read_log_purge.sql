create or replace function public.purge_bulk_list_read_log(retention_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - make_interval(days => greatest(retention_days, 1));
  deleted_rows bigint;
begin
  delete from public.bulk_list_read_log where created_at < cutoff;
  get diagnostics deleted_rows = row_count;
  return jsonb_build_object('deletedRows', deleted_rows, 'cutoff', cutoff);
end;
$$;

revoke execute on function public.purge_bulk_list_read_log(integer) from public, anon, authenticated;
grant execute on function public.purge_bulk_list_read_log(integer) to service_role;