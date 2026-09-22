/**
 * Seed demo organization leads into Supabase.
 * Run: npm run db:seed
 */
import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
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

import { leadToInsertRow } from "../lib/db/lead-mapper"
import { MOCK_LEADS } from "../lib/leads"
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

  const rows = MOCK_LEADS.map((lead) => {
    const row = leadToInsertRow(
      { ...lead, id: randomUUID() },
      organization.id,
      "demo"
    )
    return row
  })

  const { error: deleteError } = await admin
    .from("leads")
    .delete()
    .eq("organization_id", organization.id)
    .eq("source", "demo")

  if (deleteError) throw deleteError

  const { error: insertError } = await admin.from("leads").insert(rows)
  if (insertError) throw insertError

  console.log(`Seeded ${rows.length} demo leads for ${organization.name} (${slug})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
