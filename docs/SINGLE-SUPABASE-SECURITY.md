# Security with one Supabase project (legacy)

**Superseded for development** by [THREE-ENVIRONMENTS.md](./THREE-ENVIRONMENTS.md) (local + staging Supabase + production).

Keep this page for **prod-only smoke** and habits when you cannot run staging.

## Before every production deploy

```bash
npm test
npm run security:verify-admin-routes
```

When you change **RLS, auth, or permissions** (migrations under `052`–`076`, profile rules, etc.), run once locally before deploy:

```bash
npm run db:verify-tenant-isolation
```

Creates temporary orgs `zz-iso-*` on the linked project and cleans them up. Prefer a quiet window; do not run in a tight loop on production.

## After deploy (5 minutes, logged in)

1. Client login → `/leads` and `/kunder` load.
2. Edit one lead field → saves.
3. If lists show **Too many requests** → Vercel `BULK_LIST_RATE_LIMIT_DISABLED=1` → redeploy.

## Prod URL smoke (no login, safe)

Read-only checks that strangers are blocked:

```bash
npm run security:smoke-prod
# or: CRM_PUBLIC_URL=https://www.cenhub.dk npm run security:smoke-staging
```

Defaults to `https://www.cenhub.dk` when env unset.

## GitHub Actions

- **Always:** `npm test` + admin route auth on every PR.
- **Tenant isolation in CI:** **off by default** (avoids throwaway orgs on your only DB). To enable on main pushes: repo **Settings → Variables** → `ENABLE_TENANT_ISOLATION_CI` = `true` and set the three Supabase secrets.

## One-time ops (no MFA required)

| Task | Where |
|------|--------|
| Incident contact | [SECURITY.md](./SECURITY.md) |
| Vercel secrets | `CRON_SECRET`, `META_APP_SECRET`, Supabase keys on Production |
| Funnel webhook secrets | Rotate if old URLs used query-string secrets |
| Backups | Supabase dashboard → enable PITR if available on your plan |

MFA on Supabase/Vercel: recommended when you onboard more staff — see [OPS-SECURITY-CHECKLIST.md](./OPS-SECURITY-CHECKLIST.md).

## Optional product hardening

Only if you explicitly request: DB redaction for hidden columns, export audit logs, webhook rate limits. Cross-client isolation is already shipped.