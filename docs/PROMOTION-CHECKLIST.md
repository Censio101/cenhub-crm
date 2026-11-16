# Promote staging → production

Use after changes are tested on **staging** ([THREE-ENVIRONMENTS.md](./THREE-ENVIRONMENTS.md)).

## App + database

- [ ] `npm run env:verify-dev` — local not on prod Supabase
- [ ] `npm test` + `npm run security:verify-admin-routes`
- [ ] Staging: leads + customers load; one inline edit
- [ ] If new SQL: `npm run db:migrate:staging` already applied on staging
- [ ] `npm run db:verify-tenant-isolation` (staging credentials in env)
- [ ] `STAGING_BASE_URL=... npm run security:smoke-staging`
- [ ] Merge to `main` / production deploy on Vercel
- [ ] If new SQL: `CONFIRM_PROD_MIGRATE=1 npm run db:migrate:prod`
- [ ] `npm run security:smoke-prod`
- [ ] Logged-in prod: 5 min smoke on `/leads` and `/kunder`

## Rollback

- **App:** Vercel → previous production deployment  
- **DB:** forward-fix migration only (no automatic down); use Supabase backup/PITR if available  
- **Rate limits:** `BULK_LIST_RATE_LIMIT_DISABLED=1` on Vercel if lists break