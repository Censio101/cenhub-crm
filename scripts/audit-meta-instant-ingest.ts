/**
 * Audit Meta instant-form ingest for one client slug.
 * Run: npx tsx scripts/audit-meta-instant-ingest.ts [slug]
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { createAdminClient } from "../lib/supabase/admin"

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

async function auditSlug(slug: string) {
  const supabase = createAdminClient()
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, slug, name, demo_mode")
    .eq("slug", slug)
    .maybeSingle()

  if (orgError || !org) {
    return { slug, found: false as const, error: orgError?.message ?? "Org not found" }
  }

  const orgId = org.id as string

  const { data: meta } = await supabase
    .from("client_meta_config")
    .select("enabled, meta_page_id, meta_ad_account_id, meta_last_synced_at")
    .eq("organization_id", orgId)
    .maybeSingle()

  const { data: forms } = await supabase
    .from("meta_lead_forms")
    .select("meta_form_id, name, enabled, field_mapping, status")
    .eq("organization_id", orgId)

  const { count: metaLeadCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("source", "meta")

  const { count: totalLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: events } = await supabase
    .from("meta_lead_inbound_events")
    .select("created_at, status_code, error_message, meta_form_id, meta_lead_id, payload")
    .eq("organization_id", orgId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20)

  const enabled = (forms ?? []).filter((f) => f.enabled)

  return {
    slug,
    found: true as const,
    org,
    meta,
    formsTotal: forms?.length ?? 0,
    enabledForms: enabled.map((f) => ({
      id: f.meta_form_id,
      name: f.name,
      status: f.status,
      hasNameMapping: Boolean(String((f.field_mapping as Record<string, string>)?.fullName || "").trim()),
      hasContactMapping: Boolean(
        String((f.field_mapping as Record<string, string>)?.email || "").trim() ||
          String((f.field_mapping as Record<string, string>)?.phone || "").trim()
      ),
    })),
    disabledForms: (forms ?? []).filter((f) => !f.enabled).length,
    metaLeadCount,
    totalLeads,
    inboundEventsLast7Days: events ?? [],
  }
}

async function main() {
  loadEnvLocal()
  const slug = process.argv[2]?.trim() || "familien-l-kke"
  console.log("=== Meta instant ingest audit ===")
  console.log("slug:", slug)
  console.log("WEBHOOK verify token set:", Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN?.trim()))
  console.log("META_APP_SECRET set:", Boolean(process.env.META_APP_SECRET?.trim()))
  console.log("")

  const result = await auditSlug(slug)
  console.log(JSON.stringify(result, null, 2))

  const supabase = createAdminClient()
  const { data: matches } = await supabase
    .from("organizations")
    .select("slug, name")
    .or("slug.ilike.%famil%,name.ilike.%famil%,name.ilike.%l-kke%")
    .limit(15)
  if (matches?.length) {
    console.log("\nSimilar org slugs in DB:")
    for (const m of matches) console.log(" -", m.slug, m.name)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
