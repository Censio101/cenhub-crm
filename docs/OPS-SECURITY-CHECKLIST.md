# Operations security checklist

Quarterly (or before major client onboarding). Not automated in CI.

## Access

- [ ] Supabase org: MFA enabled for all staff with project access
- [ ] Vercel team: MFA enabled for deploy access
- [ ] Mailgun / Meta Business: review who has admin

## Data recovery

- [ ] Supabase **PITR** enabled on production project
- [ ] Run a **PITR drill** per [BACKUP-RUNBOOK.md](./BACKUP-RUNBOOK.md) (restore to throwaway branch, verify one lead row)

## Secrets

- [ ] `CRON_SECRET`, `META_APP_SECRET`, funnel webhook secrets present on Vercel production
- [ ] Rotate funnel webhook secrets if query-string URLs were ever logged (Bearer-only policy since 074)
- [ ] GitHub Actions Supabase secrets target **staging**, not production (see [STAGING-SECURITY.md](./STAGING-SECURITY.md))

## Incident readiness

- [ ] Incident contact in [SECURITY.md](./SECURITY.md) is current
- [ ] On-call knows `POST /api/admin/organizations/{slug}/leads/{id}/restore` for accidental soft deletes

## Verification

```bash
npm test
npm run security:verify-admin-routes
npm run db:verify-tenant-isolation   # staging DB recommended
```

On staging URL:

```bash
npm run security:smoke-staging
```