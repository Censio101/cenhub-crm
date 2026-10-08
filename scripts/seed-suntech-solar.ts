/**
 * SunTech: solar lead sheet template, services, and demo leads.
 * Run: npm run db:seed-suntech
 * Env: SUNTECH_ORG_SLUG (default: suntech)
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
    // optional
  }
}

loadEnvLocal()

import { seedSuntechSolarDemo } from "../lib/db/suntech-solar-seed"
import { createAdminClient } from "../lib/supabase/admin"

async function resolveOrganizationSlug(admin: ReturnType<typeof createAdminClient>) {
  const preferred = process.env.SUNTECH_ORG_SLUG?.trim()
  const candidates = [
    preferred,
    "suntech",
    "sun-tech",
    "suntech-solar",
  ].filter((s): s is string => Boolean(s))

  for (const slug of [...new Set(candidates)]) {
    const { data } = await admin.from("organizations").select("slug").eq("slug", slug).maybeSingle()
    if (data?.slug) return data.slug as string
  }

  const { data: fuzzy } = await admin
    .from("organizations")
    .select("slug, name")
    .ilike("name", "%suntech%")
    .limit(5)

  if (fuzzy?.length === 1) return fuzzy[0].slug as string
  if (fuzzy && fuzzy.length > 1) {
    console.error("Multiple SunTech-like organizations found; set SUNTECH_ORG_SLUG:")
    for (const row of fuzzy) console.error(`  - ${row.slug} (${row.name})`)
    process.exit(1)
  }

  throw new Error(
    `SunTech organization not found. Create the client or set SUNTECH_ORG_SLUG (tried: ${candidates.join(", ")})`
  )
}

async function main() {
  const admin = createAdminClient()
  const slug = await resolveOrganizationSlug(admin)

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .single()

  if (orgError || !organization) {
    throw orgError ?? new Error(`Organization not found: ${slug}`)
  }

  const result = await seedSuntechSolarDemo(admin, organization.id)

  console.log(`SunTech seed complete for ${organization.name} (${organization.slug})`)
  console.log(`  Template: ${result.templateId} (Solar panel template)`)
  console.log(`  Custom fields: ${result.customFieldKeys.join(", ")}`)
  console.log(`  Services (slugs): ${result.serviceSlugs.join(", ")}`)
  console.log(`  Leads inserted: ${result.leadsInserted}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
