/**
 * Apply pending migrations to PRODUCTION Supabase only when explicitly confirmed.
 * Run: CONFIRM_PROD_MIGRATE=1 npm run db:migrate:prod
 */
import { execSync } from "node:child_process"

const PROD_REF = process.env.SUPABASE_PROD_PROJECT_REF ?? "jrywehprthtydlpohuef"

if (process.env.CONFIRM_PROD_MIGRATE !== "1") {
  console.error(
    "Refusing to migrate production. Run on staging first (npm run db:migrate:staging), then:\n" +
      "  CONFIRM_PROD_MIGRATE=1 npm run db:migrate:prod"
  )
  process.exit(2)
}

console.log(`Pushing migrations to PRODUCTION project ref ${PROD_REF} ...`)
execSync(`supabase db push --project-ref ${PROD_REF}`, {
  stdio: "inherit",
  env: process.env,
})