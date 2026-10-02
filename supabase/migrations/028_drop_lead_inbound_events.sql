-- Webhook deliveries are no longer stored: every request wrote a row (including probes with a
-- wrong token and full payloads of failures), which was database overhead nobody needed.
drop table if exists public.lead_inbound_events;
