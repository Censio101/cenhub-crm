/**
 * Seed demo organization leads into Supabase.
 * Run: npm run db:seed
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), ".env.local")
    const content = readFileSync(envPath, "utf8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const separator = trimmed.indexOf("=")
      if (separator === -1) continue
      const key = trimmed.slice(0, separator)
      const value = trimmed.slice(separator + 1)
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // .env.local is optional when env vars are already exported
  }
}

loadEnvLocal()

import { seedDemoOrganizationData } from "../lib/db/demo-organization-seed"
import { createAdminClient } from "../lib/supabase/admin"

async function main() {
  const slug = process.env.CRM_DEMO_ORG_SLUG ?? "nordkystens-tomrer"
  const admin = createAdminClient()

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .single()

  if (orgError || !organization) {
    throw orgError ?? new Error(`Organization not found: ${slug}`)
  }

  const result = await seedDemoOrganizationData(admin, organization.id)
  console.log(
    `Seeded ${result.leadsCount} demo leads and ${result.adMetricsMonths} ad months for ${organization.name} (${slug})`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
