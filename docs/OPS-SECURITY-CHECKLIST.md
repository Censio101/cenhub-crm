# Operations security checklist

Quarterly (or before major client onboarding). Not automated in CI.

## Access

- [ ] Supabase org: MFA enabled for all staff (**optional / deferred** if not using yet)
- [ ] Vercel team: MFA enabled for deploy access (**optional / deferred**)
- [ ] Mailgun / Meta Business: review who has admin

## Data recovery

- [ ] Supabase **PITR** enabled on production project
- [ ] Run a **PITR drill** per [BACKUP-RUNBOOK.md](./BACKUP-RUNBOOK.md) (restore to throwaway branch, verify one lead row)

## Secrets

- [ ] `CRON_SECRET`, `META_APP_SECRET`, funnel webhook secrets present on Vercel production
- [ ] Rotate funnel webhook secrets if query-string URLs were ever logged (Bearer-only policy since 074)
- [ ] Single Supabase: tenant isolation **local only** unless `ENABLE_TENANT_ISOLATION_CI` is set (see [SINGLE-SUPABASE-SECURITY.md](./SINGLE-SUPABASE-SECURITY.md))

## Incident readiness

- [ ] Incident contact in [SECURITY.md](./SECURITY.md) is current
- [ ] On-call knows `POST /api/admin/organizations/{slug}/leads/{id}/restore` for accidental soft deletes

## Verification

```bash
npm test
npm run security:verify-admin-routes
npm run db:verify-tenant-isolation   # local, before RLS/auth deploys (one Supabase)
```

Prod URL smoke (read-only):

```bash
npm run security:smoke-prod
```