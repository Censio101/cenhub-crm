# Cenhub CRM — security

Last updated: 2026-03-26 (security roadmap execution)

## Threat model (summary)

Multi-tenant B2B CRM: each **organization** is a client. Assets are lead PII, customer data, Meta tokens, funnel webhook secrets, and workspace Mailgun keys. Primary threats: cross-tenant access, credential/integration abuse, irreversible data loss, and insider export.

## Shipped controls (baseline)

| Area | Control |
|------|---------|
| Auth | Invite redeem requires one-time `token`; safe `next` on callback; magic-link rate limit (`auth_request_log`, migration 071) |
| Tenant | RLS on org-scoped tables; profile privilege lock (052); `verify-tenant-isolation` script |
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
| CI | GitHub Actions: `npm test` + admin-route auth check; tenant isolation on main push |

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

## Operations checklist (outside repo)

- [ ] Supabase: PITR enabled; dashboard MFA for staff; separate staging project
- [ ] Vercel: `CRON_SECRET`, `META_APP_SECRET`, service role only on server
- [ ] Rotate funnel webhook secrets if old URLs with query params were logged
- [ ] Mailgun domain aligned with `censio_workspace_settings.site_url`

## Restore deleted lead (Censio admin)

`POST /api/admin/organizations/{slug}/leads/{id}/restore` (requires Censio admin session).

## Incident contact

Define your on-call / security contact here: _______________

## Related docs

- [RELEASE-REGRESSION.md](./RELEASE-REGRESSION.md) — test team checklist
- [BACKUP-RUNBOOK.md](./BACKUP-RUNBOOK.md) — PITR / recovery
- [GDPR.md](./GDPR.md) — subprocessors and DSAR outline
