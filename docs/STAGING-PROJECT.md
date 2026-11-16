# Cenhub CRM Staging (Supabase)

| | |
|--|--|
| **Name** | Cenhub CRM Staging |
| **Project ref** | `jyqujippulfaixfawuuc` |
| **API URL** | `https://jyqujippulfaixfawuuc.supabase.co` |
| **Dashboard** | https://supabase.com/dashboard/project/jyqujippulfaixfawuuc |
| **Region** | eu-west-1 (same as production) |

**Production** (unchanged): `jrywehprthtydlpohuef`

**Censio Internal** (`uuqlrkeovlgtjuuqgyme`) is a **different app** — not used for Cenhub staging.

## Local + staging website

Both use **this** project (one staging database).

1. Copy API keys from dashboard → [staging.env.example](./staging.env.example) → `.env.local`
2. `supabase link --project-ref jyqujippulfaixfawuuc`
3. Optional: copy prod data once → [CLONE-PROD-TO-STAGING.md](./CLONE-PROD-TO-STAGING.md)

CLI is linked to this project; `npm run db:migrate:staging` updates **staging only**.