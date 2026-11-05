# Backup and recovery runbook

## Targets (define with business)

| Metric | Suggested starting point |
|--------|---------------------------|
| RPO (max data loss) | 24h without PITR; minutes with PITR |
| RTO (time to restore service) | 4h for full DB restore drill |

## Supabase Postgres

1. **Confirm PITR** — Supabase project → Database → Backups: point-in-time recovery enabled on production.
2. **Quarterly drill** — Restore to a **new** staging branch/project from a timestamp; run `npm run db:verify-tenant-isolation` and B3 smoke on that branch.
3. **Accidental org delete** — Censio admin `DELETE` org is destructive; prefer soft-disable. Recovery = PITR restore to clone + extract org rows, or restore entire DB (last resort).

## Soft-deleted leads

- Client delete is **soft** (`deleted_at`). Row remains in DB.
- **Restore:** `POST /api/admin/organizations/{slug}/leads/{id}/restore` (Censio admin).
- **Audit:** `lead_audit_events` for who deleted and when.

## Vercel / application

- Instant rollback to previous deployment if a release breaks auth or webhooks (does not undo DB migrations).
- Migration failures: fix-forward SQL in `supabase/migrations/`; do not disable RLS.

## Secrets after incident

Rotate: `CRON_SECRET`, funnel webhook secrets, Meta app secret, Supabase service role (if exposed), Mailgun API key.
