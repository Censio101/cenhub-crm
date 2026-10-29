/**
 * Checks the Meta side of "send won leads to Meta" for every client, read-only:
 *  - which pixels the system token can see on each linked ad account (the dropdown source)
 *  - how many leads carry a valid 15-17 digit Meta lead ID
 *  - the state of the outbox
 *
 * To also send ONE test event (shown only in Events Manager > Test events, never in real
 * reporting): AUDIT_ORG_SLUG=<slug> CAPI_TEST_CODE=<code from Events Manager> \
 *   npm run db:verify-meta-conversions
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

import { getMetaConfigRow } from "../lib/db/meta-config-repository"
import { sendCapiTestEvent } from "../lib/meta/capi-outbox"
import { isMetaLeadId } from "../lib/meta/conversions-api"
import { fetchAdAccountPixels } from "../lib/meta/pixels"
import { resolveMarketingAccessTokenForConfig } from "../lib/meta/resolve-page-access-token"
import { createAdminClient } from "../lib/supabase/admin"

async function main() {
  const admin = createAdminClient()
  const only = process.env.AUDIT_ORG_SLUG?.trim()
  let query = admin.from("organizations").select("id, slug").order("slug")
  if (only) query = query.eq("slug", only)
  const { data: orgs, error } = await query
  if (error) throw error

  for (const org of orgs ?? []) {
    const config = await getMetaConfigRow(admin, org.id)
    if (!config?.meta_ad_account_id?.trim()) continue

    const { data: leads } = await admin
      .from("leads")
      .select("legacy_id, source, status")
      .eq("organization_id", org.id)
      .eq("source", "meta")
    const metaLeads = (leads ?? []).filter((lead) => isMetaLeadId(lead.legacy_id as string))
    const won = metaLeads.filter((lead) => lead.status === "won").length

    const { data: events } = await admin
      .from("meta_capi_events")
      .select("status")
      .eq("organization_id", org.id)
    const byStatus = new Map<string, number>()
    for (const event of events ?? []) {
      byStatus.set(event.status as string, (byStatus.get(event.status as string) ?? 0) + 1)
    }

    let pixelText = "no token"
    const token = resolveMarketingAccessTokenForConfig(config)
    if (token) {
      try {
        const pixels = await fetchAdAccountPixels(config.meta_ad_account_id, token, {
          bypassCache: true,
        })
        pixelText = pixels.length
          ? pixels.map((p) => `${p.name} (${p.id}${p.isCrm ? ", CRM" : ""})`).join("; ")
          : "none on this ad account"
      } catch (pixelError) {
        pixelText = `ERROR ${pixelError instanceof Error ? pixelError.message : pixelError}`
      }
    }

    console.log(`\n${org.slug}`)
    console.log(`  pixels:      ${pixelText}`)
    console.log(`  chosen:      ${config.meta_pixel_id || "-"} | switch: ${config.capi_enabled ? "on" : "off"}`)
    console.log(`  Meta leads:  ${metaLeads.length} with a valid lead ID, ${won} won`)
    console.log(
      `  outbox:      ${[...byStatus.entries()].map(([k, v]) => `${k} ${v}`).join(", ") || "empty"}`
    )

    const code = process.env.CAPI_TEST_CODE?.trim()
    if (only && code) {
      const result = await sendCapiTestEvent(admin, org.id, code)
      console.log(`  test event:  ${result.ok ? "OK" : "FAILED"} - ${result.message}`)
    }
  }
}

void main()
