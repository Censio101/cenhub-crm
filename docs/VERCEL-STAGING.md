# Vercel staging — staging.cenhub.dk

Production: **www.cenhub.dk** + **Censio CRM Production** Supabase.  
Staging: **staging.cenhub.dk** (you add DNS) + **Cenhub CRM Staging** Supabase (`jyqujippulfaixfawuuc`).

## Already configured (Vercel project `cenhub-crm`)

**Preview-only** environment variables (not production):

- `NEXT_PUBLIC_SUPABASE_URL` → staging Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → staging
- `SUPABASE_SERVICE_ROLE_KEY` → staging
- `NEXT_PUBLIC_SITE_URL`, `CRM_SITE_URL`, `CRM_PUBLIC_URL` → `https://staging.cenhub.dk`
- `CRM_APP_ENV` → `staging`
- `CRM_BLOCK_OUTBOUND_EMAIL` → `1`
- `CRON_SECRET` → separate staging secret (Preview only)

**Git:** branch [`staging`](https://github.com/Censio101/cenhub-crm/tree/staging) pushed — Preview deployments use Preview env.

**Production** env vars unchanged (prod Supabase, www.cenhub.dk).

## What you do in DNS

See [DNS-STAGING-CENHUB.md](./DNS-STAGING-CENHUB.md):

- **CNAME** `staging` → `cname.vercel-dns.com` (or the exact target Vercel shows)

Then Vercel → **cenhub-crm** → **Domains** → add `staging.cenhub.dk` → assign to branch **`staging`** (Preview).

If domain add fails until a green deploy: push to `staging` after `main` is green, or assign the domain to the latest Preview URL first.

## Local

Copy staging keys → `.env.local` ([LOCAL-ENV-SETUP.md](./LOCAL-ENV-SETUP.md)).  
`npm run env:verify-dev` must not show prod ref `jrywehprthtydlpohuef`.

## Smoke

```bash
STAGING_BASE_URL=https://staging.cenhub.dk npm run security:smoke-staging
```

Until DNS works, use the Preview URL from Vercel (Deployments → staging branch).

## Do not

- Point Make/Meta **production** webhooks at staging unless you intend test traffic there.
- Enable production crons on Preview (see `vercel.json` — crons run on Production).