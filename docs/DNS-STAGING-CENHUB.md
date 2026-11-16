# DNS: staging.cenhub.dk → Vercel

Add this record at your **cenhub.dk** DNS host (same place as `www`):

| Type | Name / Host | Value | TTL |
|------|-------------|--------|-----|
| **CNAME** | `staging` | `b51cf8dd46f2ca7c.vercel-dns-016.com` | 300 (or default) |

(DNS host: **Simply.com** — same as `www` for cenhub.dk.)

After saving DNS:

1. Vercel already has **staging.cenhub.dk** on project **cenhub-crm**.
2. In Vercel → Domains → assign **`staging` branch** (Preview) if offered.
3. Verify: `npx vercel domains verify staging.cenhub.dk` (or wait until DNS propagates).
4. SSL usually ready within minutes.

Verify:

```bash
STAGING_BASE_URL=https://staging.cenhub.dk npm run security:smoke-staging
```