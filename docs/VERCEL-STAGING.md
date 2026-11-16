# Vercel staging (third URL)

Production stays on **www.cenhub.dk** with **production** Supabase env vars. Staging uses a **separate** Supabase project.

## 1. Environment variables

In Vercel → Project → Settings → Environment Variables:

| Variable | Production | Preview (staging) |
|----------|------------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Prod URL | **Staging** URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Prod | **Staging** |
| `SUPABASE_SERVICE_ROLE_KEY` | Prod | **Staging** |
| `CRM_PUBLIC_URL` | `https://www.cenhub.dk` | Staging URL |
| `CRM_APP_ENV` | (unset) | `staging` |
| `CRM_BLOCK_OUTBOUND_EMAIL` | `0` or unset | `1` |
| `CRON_SECRET` | Prod value | **Different** secret |
| Mailgun | Real | Omit keys or block via `CRM_BLOCK_OUTBOUND_EMAIL` |

Copy other vars (Meta, etc.) only when you need them on staging; prefer **staging Meta app** or leave webhooks prod-only.

## 2. Stable staging URL

Option A — **Preview** deployments from branch `staging`  
Option B — Vercel **alias** e.g. `staging.cenhub.dk` → latest preview  
Option C — `cenhub-crm-staging.vercel.app` from project settings

Set `STAGING_BASE_URL` locally when running `npm run security:smoke-staging`.

## 3. Deployment protection

Settings → Deployment Protection → enable **password** or Vercel authentication on **Preview** (staging has a copy of client PII).

## 4. Branch workflow

- `staging` branch → auto Preview with Preview env vars  
- `main` → Production after promotion  

## 5. Cron on staging

Do **not** duplicate production crons on staging unless you use staging-only secrets and data. Vercel crons on Preview are usually disabled by default.