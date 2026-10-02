-- Webhook sample capture: an admin puts a webhook into "listening" mode, the sender fires one
-- request, and that request is stored as the sample (not as a lead) so fields can be mapped by
-- picking from what was actually sent. One sample per webhook, overwritten each time.
alter table public.lead_funnels
  add column if not exists sample_listening_until timestamptz,
  add column if not exists sample_payload jsonb,
  add column if not exists sample_received_at timestamptz,
  add column if not exists sample_error text;

-- Webhook secrets and (now) captured payloads must never be readable with the public key.
-- All access is server-side through the service role, which bypasses RLS.
alter table public.lead_funnels enable row level security;

-- Stores the sample for the single request that arrives while the webhook is listening.
-- Atomic and uses the database clock: of two simultaneous requests only one returns true; the
-- other is then handled as a normal lead by the caller.
create or replace function public.capture_funnel_sample(
  p_funnel_id uuid,
  p_payload jsonb
)
returns boolean
language plpgsql
as $$
declare
  v_id uuid;
begin
  update public.lead_funnels
  set sample_payload = p_payload,
      sample_received_at = now(),
      sample_listening_until = null,
      sample_error = null
  where id = p_funnel_id
    and sample_listening_until is not null
    and sample_listening_until > now()
  returning id into v_id;

  return v_id is not null;
end;
$$;

revoke execute on function public.capture_funnel_sample(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.capture_funnel_sample(uuid, jsonb) to service_role;
