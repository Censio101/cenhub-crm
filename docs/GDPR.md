# GDPR / processor notes (outline)

Legal review required. This is an engineering checklist, not legal advice.

## Roles

- **Censio** — typically processor for client lead data; controller for onboarding/applicant data and staff accounts.
- **Clients** — controllers for their end-customer (lead) data.

## Subprocessors (document in client DPA)

| Vendor | Purpose |
|--------|---------|
| Supabase | Postgres, auth, storage |
| Vercel | Hosting, cron |
| Mailgun | Transactional email |
| Meta | Lead Ads, ads metrics (client-configured) |

## Data categories

Lead PII (name, email, phone, address, custom fields), usage logs (`auth_request_log`, `lead_audit_events`), Meta sync logs.

## Retention

| Data | Retention |
|------|-----------|
| `auth_request_log` | 30 days (cron purge) |
| Meta sync logs | per migration 009 (default 3 days purge function) |
| Leads | Until client/Censio deletes or contract end |
| Soft-deleted leads | Until restore or hard delete by Censio admin |

## Data subject requests (DSAR)

1. Identify org and lead email in admin tools / SQL (service role).
2. Export: existing CSV export + admin export if needed.
3. Erasure: soft delete or hard delete lead; propagate to `customers`; document in `lead_audit_events`.

## Security measures (summary)

See [SECURITY.md](./SECURITY.md): RLS tenant isolation, audit trail, encryption in transit (TLS), access control by role.

## Penetration test

Annual external test recommended (auth, IDOR, webhooks, cross-tenant). Scope in security roadmap Phase 6.
