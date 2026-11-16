---
name: post-security-regression
description: Run after any security hardening change before or right after deploy. Verifies leads, customers, auth, webhooks, and admin paths still work for live users. Use when the user worries about breaking production, Capbooks/workflows, or client dashboards after security PRs.
---

# Post-security regression (Cenhub CRM)

You are the **regression agent**. Do not add new security features in this pass—only verify nothing broke.

## When to run

- After migrations touching RLS, auth, `app/api/leads`, `app/api/customers`, cron, or webhooks
- Before telling the user a security change is safe for live users
- After deploy to production (spot-check)

## Automated gate (must all pass)

Run in repo root:

```bash
npm test
npm run security:verify-admin-routes
```

If Supabase env is available (prefer **staging**, not prod when possible):

```bash
npm run db:verify-tenant-isolation
```

Targeted unit tests when bulk-list limits changed:

```bash
npm test -- lib/security/bulk-list-rate-limit.test.ts
npm test -- lib/leads/funnel-webhook-route.test.ts
```

## Functional smoke (live or staging)

Use [docs/RELEASE-REGRESSION.md](../../docs/RELEASE-REGRESSION.md). Minimum for security deploys:

| ID | Check |
|----|--------|
| Login | Client user → `/leads` loads sheet, no 429 spam in Network |
| T6 | Client cannot read another org (isolation script or manual) |
| Leads | Edit one cell inline; list refreshes |
| Customers | `/kunder` loads |
| Live sync | With two tabs or webhook ingest, list updates within ~1s (no persistent 429) |
| Admin | Censio admin → `/admin` loads; unauthenticated `GET /api/admin/organizations` → 401 |
| Webhooks | Funnel test with Bearer (existing test suite) |
| Cron | No Bearer → 401 (staging: `npm run security:smoke-staging`) |

## If `GET /api/leads` returns 429

1. Check Vercel logs for `[bulk-list-rate-limit] high read volume`
2. Emergency: set env `BULK_LIST_RATE_LIMIT_DISABLED=1` on Vercel and redeploy (see [docs/LIVE-SAFE-SECURITY-DEPLOYS.md](../../docs/LIVE-SAFE-SECURITY-DEPLOYS.md))
3. Tune `BULK_LIST_RATE_LIMITS` in `lib/security/bulk-list-rate-limit.ts` if cap is too low

## Output format

Report to the user:

1. **Automated:** pass/fail per command
2. **Risk:** anything that could break live users (rate limits, RLS, middleware)
3. **Manual:** what they should click-test in prod if you could not run browser
4. **Go / no-go** for production