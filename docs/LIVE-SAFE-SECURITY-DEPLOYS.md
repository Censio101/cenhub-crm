# Live-safe security deploys

Cenhub has **live client organizations**. Security changes should ship with regression checks, not “hope and deploy.”

## Agent workflow (in Cursor)

Two project skills work as **separate agents**:

| Agent | Skill | When |
|-------|-------|------|
| **Security impl** | `@.cursor/skills/security-hardening-live-safe` | Writing rate limits, RLS, auth, migrations |
| **Regression / QA** | `@.cursor/skills/post-security-regression` | Before merge and after deploy |

Example prompts:

- “Use **security-hardening-live-safe** to add X, then **post-security-regression** before we merge.”
- “Run **post-security-regression** only — we just deployed `main` to prod.”

The rule [`.cursor/rules/security-change-gate.mdc`](../.cursor/rules/security-change-gate.mdc) applies when you touch `app/api`, `lib/security`, migrations, etc.

## Automated gate (run on every security deploy)

```bash
npm test
npm run security:verify-admin-routes
npm run db:verify-tenant-isolation   # local only before RLS/auth changes (one Supabase)
```

Prod / public URL smoke (no login):

```bash
npm run security:smoke-prod
```

See [SINGLE-SUPABASE-SECURITY.md](./SINGLE-SUPABASE-SECURITY.md).

Full manual **top 15** list: see output of **post-security-regression** skill or [RELEASE-REGRESSION.md](./RELEASE-REGRESSION.md) (T6, T7, T12, webhooks, login, admin).

## Emergency: dashboard shows “Too many requests” (429)

1. **Vercel → Environment variables** → set `BULK_LIST_RATE_LIMIT_DISABLED=1` on Production → Redeploy (instant kill-switch; lists work again).
2. Check logs for `[bulk-list-rate-limit] high read volume`.
3. Fix forward: tune `perUserOrgRoute` in `lib/security/bulk-list-rate-limit.ts` or debounce customer refresh; remove kill-switch when stable.

Rate limiting **fails open** if the log table is unreachable (dashboard still loads).

## What changed recently (bulk list cap)

- `GET /api/leads` and `GET /api/customers`: **150 requests/minute** per user per org (separate counters).
- Designed so **live sync** (webhook/Meta ingest) does not block normal use; blocks scripted scraping.

## Do not break

- Lead sheet (`/leads`) and customer sheet (`/kunder`) — shared columns and filters
- Funnel/Meta **webhooks** (Bearer/HMAC unchanged)
- Client login and Censio admin hub

When in doubt, run the regression agent before prod.