-- Meta sync log retention (default 3 days). Purged by cron via purge_meta_sync_logs().

create or replace function public.purge_meta_sync_logs(retention_days integer default 3)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - make_interval(days => greatest(retention_days, 1));
  deleted_runs bigint;
  deleted_batches bigint;
begin
  delete from public.meta_sync_runs
  where started_at < cutoff;

  get diagnostics deleted_runs = row_count;

  delete from public.meta_sync_batches
  where started_at < cutoff;

  get diagnostics deleted_batches = row_count;

  return jsonb_build_object(
    'deletedRuns', deleted_runs,
    'deletedBatches', deleted_batches,
    'cutoff', cutoff,
    'retentionDays', retention_days
  );
end;
$$;

revoke all on function public.purge_meta_sync_logs(integer) from public;
grant execute on function public.purge_meta_sync_logs(integer) to service_role;
