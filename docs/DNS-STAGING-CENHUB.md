# DNS: staging.cenhub.dk → Vercel

Add this record at your **cenhub.dk** DNS host (same place as `www`):

| Type | Name / Host | Value | TTL |
|------|-------------|--------|-----|
| **CNAME** | `staging` | `cname.vercel-dns.com` | 300 (or default) |

After saving DNS:

1. Vercel → **cenhub-crm** → **Settings → Domains** → add `staging.cenhub.dk`.
2. Assign to **Git branch** `staging` (Preview), not Production.
3. Wait for SSL (few minutes).

If Vercel shows a **different** CNAME target (project-specific), use **exactly** what the dashboard shows instead of `cname.vercel-dns.com`.

Verify:

```bash
STAGING_BASE_URL=https://staging.cenhub.dk npm run security:smoke-staging
```