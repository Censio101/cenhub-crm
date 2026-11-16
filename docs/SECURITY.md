# Cenhub CRM — security

Last updated: 2026-03-26 (security roadmap execution)

## Threat model (summary)

Multi-tenant B2B CRM: each **organization** is a client. Assets are lead PII, customer data, Meta tokens, funnel webhook secrets, and workspace Mailgun keys. Primary threats: cross-tenant access, credential/integration abuse, irreversible data loss, and insider export.

## Shipped controls (baseline)

| Area | Control |
|------|---------|
| Auth | Invite redeem requires one-time `token`; safe `next` on callback; magic-link rate limit (`auth_request_log`, migration 071) |
| Tenant | RLS on org-scoped tables; profile privilege lock (052); `verify-tenant-isolation` script |
| Bulk list reads | `GET /api/leads` and `GET /api/customers` — per-user/org/minute cap via `bulk_list_read_log` (083) |
| Delete roles | `can_delete_org_leads` (053); API mirrors UI |
| Meta tokens | Column-level SELECT revoke for clients (072) |
| Webhooks | Funnel Bearer only; Meta HMAC fail-closed; cron Bearer only |
| Storage | Signed URLs require org-scoped path prefix |
| Definer RPC | Anon cannot execute `is_censio_admin`, `current_organization_id`, `can_delete_org_leads` (073) |

### New in this release (074–076)

| Area | Control |
|------|---------|
| Soft delete | `soft_delete_lead()` RPC + `deleted_at`; clients do not see deleted rows; Censio admin can restore via API |
| Audit | Append-only `lead_audit_events` (create, update, soft/hard delete, restore) |
| Auth log retention | `purge_auth_request_log()` via daily cron |
| Edge | Security headers in `next.config.ts`; timing-safe funnel webhook secret compare |
| CI | GitHub Actions: `npm test` + admin-route auth check; tenant isolation on PR and main push (when GitHub Supabase secrets are set) |

## Intentional breaking changes (do not revert)

1. **Invites** — redeem requires `?token=` from email; re-send old invites from admin.
2. **Funnel / cron** — `Authorization: Bearer <secret>` only; query-string secrets return 401.
3. **Magic link** — generic response (no email enumeration).
4. **Meta POST** — requires `META_APP_SECRET` in production.

## Verification commands

```bash
npm test
npx tsx scripts/verify-admin-routes-auth.ts
npm run db:verify-tenant-isolation   # needs .env.local / linked Supabase
```

Production smoke (manual):

- Unauthenticated `GET /api/admin/organizations` → 401
- `POST /api/auth/redeem-invite` without token → 400
- Funnel/cron without Bearer → 401

Functional QA: see [RELEASE-REGRESSION.md](./RELEASE-REGRESSION.md) (B3 checklist + sign-off).

## Hidden lead sheet columns (confidentiality)

Columns marked hidden for a client are **removed in `/api/leads`** responses. The dashboard loads leads through that API (and live sync refetches the same path). They are **not** encrypted at rest in `leads.custom_fields`: a technical user in the same organization could still read hidden keys with the browser Supabase client (PostgREST). Treat “hidden” as **dashboard confidentiality**, not protection against a malicious insider with DevTools. See [SECURITY-AUDIT.md](./SECURITY-AUDIT.md) F-01 options if you need DB-level enforcement.

## Operations checklist (outside repo)

- [ ] Supabase: PITR if plan allows; MFA when ready; one-project runbook ([SINGLE-SUPABASE-SECURITY.md](./SINGLE-SUPABASE-SECURITY.md), [OPS-SECURITY-CHECKLIST.md](./OPS-SECURITY-CHECKLIST.md))
- [ ] Vercel: `CRON_SECRET`, `META_APP_SECRET`, service role only on server
- [ ] Rotate funnel webhook secrets if old URLs with query params were logged
- [ ] Mailgun domain aligned with `censio_workspace_settings.site_url`

## Restore deleted lead (Censio admin)

`POST /api/admin/organizations/{slug}/leads/{id}/restore` (requires Censio admin session).

## Incident contact

**Security / on-call:** update this line with your live contact (email or pager).

Default placeholder until set: `security@cenhub.dk` (replace before an incident).

## Related docs

- [SECURITY-AUDIT.md](./SECURITY-AUDIT.md) — Cloudflare-guided audit (2026-11-16)
- [THREE-ENVIRONMENTS.md](./THREE-ENVIRONMENTS.md) — local → staging → production
- [PROMOTION-CHECKLIST.md](./PROMOTION-CHECKLIST.md) — ship to prod safely
- [SINGLE-SUPABASE-SECURITY.md](./SINGLE-SUPABASE-SECURITY.md) — legacy one-DB notes
- [STAGING-SECURITY.md](./STAGING-SECURITY.md) — optional second project
- [OPS-SECURITY-CHECKLIST.md](./OPS-SECURITY-CHECKLIST.md) — MFA, PITR, secrets
- [RELEASE-REGRESSION.md](./RELEASE-REGRESSION.md) — test team checklist
- [BACKUP-RUNBOOK.md](./BACKUP-RUNBOOK.md) — PITR / recovery
- [GDPR.md](./GDPR.md) — subprocessors and DSAR outline
