# Cenhub CRM — security audit (Cloudflare-guided)

**Audit date:** 2026-11-16  
**Scope:** Staging-oriented review aligned with [Cloudflare security-audit-skill](https://github.com/cloudflare/security-audit-skill) attack classes; focus on **cross-tenant lead/client theft** and **unauthenticated ingest**.  
**Method:** Recon from `app/api`, middleware, RLS migrations, webhooks; automated verifiers; codebase hunts (no production destructive tests).

## Executive summary

**Are multi-tenant security basics in place?** **Yes, for isolation** — RLS plus handler-level auth block the scripted cross-tenant abuse matrix. **Partial for confidentiality and abuse resistance** — hidden custom columns are API-only, bulk lead export has no rate limits, and ops/staging split is not fully exercised in CI.

| Priority | Risk | Lead/client theft? |
|----------|------|-------------------|
| 1 | Same-org user can read “hidden” `custom_fields` via PostgREST (bypassing `/api/leads`) | No (same tenant); **confidentiality** gap |
| 2 | Unbounded authenticated `GET /api/leads` (export / scraping) | **Mitigated** — 90 req/min per user+org ([083](../supabase/migrations/083_bulk_list_read_log.sql)) |
| 3 | No dedicated staging Supabase in ops checklist (dynamic tests run against linked project) | Indirect (mis-test / prod data in checks) |

**Top 3 actions:** (1) Accept or fix hidden-column storage model; (2) rate-limit and log bulk lead reads; (3) provision staging + run verifiers only there.

---

## Staging and test environment

| Item | Status |
|------|--------|
| Dedicated staging Supabase | **Not in repo** — ops checklist in [SECURITY.md](./SECURITY.md) still open |
| `.env.staging` | **Not present** — local runs use `.env.local` (linked project `jrywehprthtydlpohuef`) |
| Vercel staging alias | **Needs validation** — confirm preview/staging URL in Vercel; prod smoke uses live deployment |
| CI Supabase secrets | On **push main** and **pull_request** (`tenant-isolation` job); requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in GitHub |
| Dynamic HTTP hunts on remote staging URL | **Not run** in this pass (code + linked DB verifiers only) |

Treat verifier runs on the linked production project as **staging-equivalent** only when throwaway orgs (`zz-iso-*`) are used; prefer a separate staging project before onboarding new clients.

---

## Trust boundaries

| Boundary | Entry points | Enforcement |
|----------|--------------|-------------|
| Anonymous | `/login`, `/tilmelding`, webhook verify, Meta GET challenge | Public routes; secrets via Bearer/HMAC on POST |
| Client session | `/api/leads`, `/api/customers`, storage signed URLs, browser Supabase (Realtime + optional direct SQL) | `requireOrganizationContext()` + RLS (`organization_id`) |
| Censio admin | `/api/admin/**` | `requireCensioAdmin()` on every admin route (76 files verified) + `createAdminClient()` where needed |
| Server-only | Cron (`CRON_SECRET`), lead ingest, Mailgun | No session; Bearer on cron |

**Important:** [`middleware.ts`](../middleware.ts) protects **pages**, not `/api/*`. Tenant safety depends on **each API handler** and **Supabase RLS** ([AGENTS.md](../AGENTS.md)).

**Assets at risk:** `leads`, `customers`, `profiles`, Meta tokens (`client_meta_config`, migration 072 column revoke), funnel `webhook_secret`, workspace Mailgun keys, PII in `custom_fields`.

---

## Cloudflare alignment matrix

| Attack class (skill module) | Cenhub surfaces | Status |
|-----------------------------|-----------------|--------|
| DATA-ISOLATION | RLS, soft delete, export via API | **Covered** (automated script) |
| WEB-PROTOCOL-AUTH | Session cookies, admin vs client, slug routes | **Covered** (admin verifier + code review) |
| PROTOCOLS / webhooks | Funnel Bearer, Meta HMAC, cron Bearer | **Covered** (unit tests + code); **Needs validation** on live staging URLs |
| CLIENT-SIDE | Sheets, notes, CSV | **Partial** — no `dangerouslySetInnerHTML` in app grep; React default escaping assumed |
| CLOUD / deployment | Vercel env, service role in bundle | **Covered** — service role not `NEXT_PUBLIC_*` |
| RESOURCE-EXHAUSTION | `GET /api/leads`, webhooks | **Not tested** / **gap** (no rate limits on lead list) |

---

## Coverage ledger (selected surfaces)

| Surface | Control | Verified |
|---------|---------|----------|
| Client lead list | `GET /api/leads` → `stripHiddenCustomFields` | Code + product path |
| Cross-org read/write leads/customers | RLS | `npm run db:verify-tenant-isolation` |
| Admin cross-org by slug | `requireCensioAdmin` + org lookup by slug | Admin route script |
| Hidden custom values | API strip only | **GAP** — PostgREST returns full JSON (see below) |
| Funnel ingest | Bearer + `timingSafeEqualString` | `lib/leads/funnel-webhook-route.test.ts` |
| Meta webhook POST | `META_APP_SECRET` signature | Code; prod env required |
| Cron jobs | `Authorization: Bearer` + `CRON_SECRET`; 503 if unset | Code review |
| Storage files | Signed URL path prefix | Code ([RELEASE-REGRESSION](./RELEASE-REGRESSION.md) manual) |
| Live sync | Realtime triggers refetch via `/api/leads` | `hooks/useLeadsLiveSync.ts` |
| Meta token column | SELECT revoked for clients | Isolation script |

---

## Findings

### Confirmed

| ID | Severity | Location | Impact | Reproduction | Fix |
|----|----------|----------|--------|--------------|-----|
| F-01 | Medium (confidentiality) | `leads.custom_fields` RLS + PostgREST | Same-org user can read values admin hid from UI/API path if they use Supabase client in DevTools | Run `npm run db:verify-tenant-isolation` → line `GAP: PostgREST exposes full custom_fields` | **Option A:** Keep policy “hidden = UI-only”; document for clients. **Option B:** Restrict client `SELECT` to a view/redacted RPC. **Option C:** Move sensitive keys to server-only table |
| F-02 | Low–Medium | `GET /api/leads`, `GET /api/customers` | Repeated full-list scraping | Exceed 90/min → 429 + `bulk_list_read_log` | **Shipped** 083–084; tune `BULK_LIST_RATE_LIMITS` if needed |
| F-03 | Low (ops) | Deployment | Verifiers may hit prod-linked DB; no `.env.staging` | This audit | Separate staging project; CI secrets point at staging only |

### Needs validation (not demonstrated on remote staging HTTP)

| ID | Topic | Notes |
|----|-------|-------|
| V-01 | Admin slug IDOR over HTTP | Handlers scope by slug; expect 401/404 — smoke: wrong slug + valid client session on `manage-bootstrap` |
| V-02 | Cron without Bearer on deployed URL | Expect 401; run against Vercel cron path once staging URL fixed |
| V-03 | Meta webhook without signature in prod | Should fail closed when `META_APP_SECRET` set |

### Rejected / mitigated

| Topic | Reason |
|-------|--------|
| Cross-tenant lead/customer read | Blocked in isolation script |
| Client escalates to `censio_admin` | Profile update blocked |
| Read Meta system user token via client | Column revoke + isolation test |
| Service role in browser bundle | Only server/scripts import service key |
| Unauthenticated admin API | 76/76 routes call `requireCensioAdmin()` |

---

## Hardening backlog (defense-in-depth)

- MFA on Supabase/Vercel staff accounts (ops checklist)
- PITR drill documented in [BACKUP-RUNBOOK.md](./BACKUP-RUNBOOK.md)
- Dedicated staging + scheduled verifier on staging
- `npm audit` — dev-only highs (e.g. `@modelcontextprotocol/sdk`); not production attack surface unless MCP server exposed
- Incident contact placeholder in [SECURITY.md](./SECURITY.md) — fill before prod incidents
- Rotate funnel secrets if query-string URLs were ever logged (policy already Bearer-only)

---

## What already works

See [SECURITY.md](./SECURITY.md) for shipped controls (RLS, soft delete + audit, webhook auth, invite tokens, magic-link rate limit, security headers in `next.config.ts`, etc.). This audit does not re-litigate those items.

---

## Recurring verification

Before production deploy:

```bash
npm test
npm run security:verify-admin-routes
npm run db:verify-tenant-isolation   # throwaway orgs; needs Supabase env
```

Manual: [RELEASE-REGRESSION.md](./RELEASE-REGRESSION.md) (e.g. unauthenticated admin 401, funnel/cron Bearer).

CI: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — tests + admin routes on every PR; tenant isolation on PR/main when secrets configured.

---

## Remediation plan (prioritized PRs — implement after approval)

| Order | Item | Cross-tenant impact |
|-------|------|---------------------|
| 1 | Document/strengthen hidden-column policy OR DB redaction (F-01) | **Option A documented** in [SECURITY.md](./SECURITY.md); B/C if needed later |
| 2 | Rate limit + logging on `GET /api/leads` (F-02) | **Done** (083–084) |
| 3 | Staging Supabase + CI secrets (F-03) | High (process) |
| 4 | Optional: extend isolation script with HTTP-level admin slug checks | Medium |
| **Done in audit branch** | Tenant isolation on PRs; GAP probe in isolation script | CI coverage |

---

## Audit methodology note

This pass follows Cloudflare **phases** (recon → hunt → validate → single doc) without committing `findings.json` or the full skill artifact tree. Severities for isolation findings require **demonstrated** behavior on the linked verifier; HTTP-only items remain **needs validation** until run against a dedicated staging URL.