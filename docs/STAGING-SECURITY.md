# Staging environment (security verification)

**Workflow:** [THREE-ENVIRONMENTS.md](./THREE-ENVIRONMENTS.md) — staging is a **separate** Supabase project, seeded once from production via [CLONE-PROD-TO-STAGING.md](./CLONE-PROD-TO-STAGING.md), then independent.

Do not point GitHub Actions tenant-isolation secrets at **production**; use staging keys.

## Provision

1. Create Supabase project `cenhub-crm-staging` (or similar).
2. `supabase link --project-ref <staging-ref>` locally; copy connection keys.
3. Copy [`docs/staging.env.example`](staging.env.example) to `.env.staging` (gitignored) and fill values.
4. `npm run db:migrate` against staging.
5. Vercel: add **Staging** environment variables (`CRON_SECRET`, `META_APP_SECRET`, Supabase keys, etc.) and a stable preview alias if desired.

## GitHub Actions

Repository **Settings → Secrets and variables → Actions**:

- `NEXT_PUBLIC_SUPABASE_URL` → staging URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → staging anon key
- `SUPABASE_SERVICE_ROLE_KEY` → staging service role

The `tenant-isolation` job runs on **pull_request** and **main** when these are set.

## HTTP smoke (staging base URL)

```bash
export STAGING_BASE_URL=https://your-staging-host.vercel.app
npm run security:smoke-staging
```

Expected:

| Check | Expected |
|-------|----------|
| `GET /api/admin/organizations` (no cookie) | 401 |
| `GET /api/cron/purge-auth-request-log` (no Bearer) | 401 or 503 (no CRON_SECRET) |
| `POST /api/webhooks/meta/leads` (no signature) | 401/403 when `META_APP_SECRET` set |

Record results in [SECURITY-AUDIT.md](./SECURITY-AUDIT.md) (V-01–V-03) after first green run.

## Local verifier (throwaway orgs)

```bash
# load staging env into shell, then:
npm run db:verify-tenant-isolation
```

Uses orgs prefixed `zz-iso-*`; safe on staging. Avoid running against prod unless you accept throwaway rows on the linked project.