/**
 * Seed demo-meta-client with locked Meta leads.
 * Run: npm run db:seed-meta-client
 */
import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { resolve } from "node:path"

import { leadToInsertRow } from "../lib/db/lead-mapper"
import { MOCK_LEADS } from "../lib/leads"
import { createAdminClient } from "../lib/supabase/admin"

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

async function main() {
  loadEnvLocal()
  const slug = "demo-meta-client"
  const admin = createAdminClient()

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .single()

  if (orgError || !organization) {
    throw orgError ?? new Error(`Organization not found: ${slug}`)
  }

  const metaLeads = MOCK_LEADS.filter((lead) => lead.platform === "meta").slice(0, 10)

  const rows = metaLeads.map((lead) =>
    leadToInsertRow({ ...lead, id: randomUUID() }, organization.id, "meta")
  )

  const { error: deleteError } = await admin
    .from("leads")
    .delete()
    .eq("organization_id", organization.id)

  if (deleteError) throw deleteError

  const { error: insertError } = await admin.from("leads").insert(rows)
  if (insertError) throw insertError

  const { error: metaConfigError } = await admin.from("client_meta_config").upsert(
    {
      organization_id: organization.id,
      meta_ad_account_id: "act_demo_meta_client",
      meta_page_id: "demo_page_meta_client",
      meta_pixel_id: "",
      enabled: false,
      meta_sync_status: "disabled",
    },
    { onConflict: "organization_id" }
  )
  if (metaConfigError) throw metaConfigError

  console.log(
    `Seeded ${rows.length} locked Meta leads for ${organization.name} (${slug})`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
