/**
 * Usage: npx tsx scripts/resend-lead-notify-by-name.ts <org-slug> <name-fragment>
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const i = trimmed.indexOf("=")
      if (i === -1) continue
      const key = trimmed.slice(0, i)
      const value = trimmed.slice(i + 1)
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // optional
  }
}

loadEnvLocal()

import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { resendLeadNotificationEmail } from "@/lib/leads/resend-lead-notify"
import { createAdminClient } from "@/lib/supabase/admin"

async function main() {
  const slug = process.argv[2]
  const nameFragment = process.argv[3]
  if (!slug || !nameFragment) {
    console.error("Usage: npx tsx scripts/resend-lead-notify-by-name.ts <org-slug> <name-fragment>")
    process.exit(1)
  }

  const admin = createAdminClient()
  const org = await getOrganizationBySlug(admin, slug)
  if (!org) {
    console.error("Organization not found:", slug)
    process.exit(1)
  }

  const { data: leads, error } = await admin
    .from("leads")
    .select("id, full_name, email, lead_funnel_id, created_at")
    .eq("organization_id", org.id)
    .is("deleted_at", null)
    .ilike("full_name", `%${nameFragment}%`)
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) throw error
  if (!leads?.length) {
    console.error("No leads matched:", nameFragment)
    process.exit(1)
  }

  console.log("Matches:")
  for (const row of leads) {
    console.log(`- ${row.id} | ${row.full_name} | funnel=${row.lead_funnel_id ?? "none"}`)
  }

  const target = leads[0]!
  console.log("\nResending for:", target.full_name, target.id)

  const result = await resendLeadNotificationEmail(admin, org.id, target.id as string)
  if (!result.ok) {
    console.error("Resend failed:", result.error)
    process.exit(1)
  }
  console.log("OK — notification email sent (check Mailgun / inbox).")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
