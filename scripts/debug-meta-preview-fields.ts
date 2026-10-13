/**
 * Compare preview cache vs live Graph field_data for recent Meta leads.
 * Run: npx tsx scripts/debug-meta-preview-fields.ts [slug]
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { createAdminClient } from "../lib/supabase/admin"
import { flattenMetaFieldData } from "../lib/meta/meta-lead-field-display"
import { fetchAllMetaLeadsPreviewFromGraph } from "../lib/meta/meta-instant-forms-service"
import { fetchMetaLeadDetails } from "../lib/meta/ingest-lead"
import { resolvePageAccessTokenForOrganization } from "../lib/meta/resolve-page-access-token"

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const separator = trimmed.indexOf("=")
      if (separator === -1) continue
      const key = trimmed.slice(0, separator)
      let value = trimmed.slice(separator + 1)
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // optional
  }
}

async function main() {
  loadEnvLocal()
  const slug = process.argv[2]?.trim() || "familien-l-kke"
  const admin = createAdminClient()
  const { data: org } = await admin
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle()
  if (!org) {
    console.error("Org not found:", slug)
    process.exit(1)
  }
  const orgId = org.id as string

  const { data: cached } = await admin
    .from("meta_leads_preview_rows")
    .select("meta_lead_id, created_time, fields")
    .eq("organization_id", orgId)
    .order("created_time", { ascending: false })
    .limit(10)

  const live = await fetchAllMetaLeadsPreviewFromGraph(admin, orgId, { daysBack: 90 })
  const liveById = new Map(live.leads.map((l) => [l.metaLeadId, l]))

  const { token } = await resolvePageAccessTokenForOrganization(admin, orgId)

  console.log("=== Cached preview rows (top 10) ===")
  for (const row of cached ?? []) {
    const id = row.meta_lead_id as string
    const fields = (row.fields ?? {}) as Record<string, string>
    const keys = Object.keys(fields)
    const liveRow = liveById.get(id)
    const liveKeys = liveRow ? Object.keys(liveRow.fields) : []
    let singleFetchKeys: string[] = []
    try {
      const detail = await fetchMetaLeadDetails(id, token)
      singleFetchKeys = Object.keys(flattenMetaFieldData(detail.field_data))
    } catch (e) {
      singleFetchKeys = [`ERROR:${e instanceof Error ? e.message : String(e)}`]
    }
    console.log({
      metaLeadId: id,
      created: row.created_time,
      cachedFieldCount: keys.length,
      cachedName: fields.full_name || fields.first_name || fields.navn || "",
      liveListFieldCount: liveKeys.length,
      liveListName:
        liveRow?.fields.full_name || liveRow?.fields.first_name || liveRow?.fields.navn || "",
      singleFetchFieldCount: singleFetchKeys[0]?.startsWith("ERROR") ? 0 : singleFetchKeys.length,
      singleFetchKeysSample: singleFetchKeys.slice(0, 8),
      cachedKeysSample: keys.slice(0, 8),
    })
  }

  console.log("\n=== Live list leads with empty fields ===")
  const emptyLive = live.leads.filter((l) => Object.keys(l.fields).length === 0)
  console.log("count:", emptyLive.length, "of", live.leads.length)
  for (const l of emptyLive.slice(0, 7)) {
    console.log({ id: l.metaLeadId, created: l.createdTime, form: l.formName })
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
