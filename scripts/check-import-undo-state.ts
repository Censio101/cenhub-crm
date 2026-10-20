/**
 * Report lead_imports status and leads still tied to import batches for an org.
 * Run: npx tsx scripts/check-import-undo-state.ts [slug]
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
      if (i < 0) continue
      const key = trimmed.slice(0, i)
      if (!process.env[key]) process.env[key] = trimmed.slice(i + 1)
    }
  } catch {
    // optional
  }
}

loadEnvLocal()

import { listLeadImports } from "../lib/db/lead-imports-repository"
import { getOrganizationBySlug } from "../lib/db/organizations-repository"
import { createAdminClient } from "../lib/supabase/admin"

const slug = process.argv[2] ?? "familien-l-kke"

async function main() {
  const admin = createAdminClient()
  const org = await getOrganizationBySlug(admin, slug)
  if (!org) {
    console.error("Org not found:", slug)
    process.exit(1)
  }

  const imports = await listLeadImports(admin, org.id, 10)
  console.log("Org:", org.name, org.id)
  console.log("Import history (newest first):", imports.length)
  for (const row of imports) {
    console.log(
      JSON.stringify({
        id: row.id,
        fileName: row.fileName,
        status: row.status,
        importedCount: row.importedCount,
        skippedCount: row.skippedCount,
        createdAt: row.createdAt,
        finishedAt: row.finishedAt,
      })
    )
    const { count, error } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("import_id", row.id)
    if (error) throw error
    console.log("  leads still with this import_id:", count ?? 0)
  }

  const { count: totalLeads, error: totalErr } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
  if (totalErr) throw totalErr
  console.log("Total leads in org:", totalLeads ?? 0)

  const { count: withImport, error: impErr } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .not("import_id", "is", null)
  if (impErr) throw impErr
  console.log("Leads with any import_id:", withImport ?? 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
