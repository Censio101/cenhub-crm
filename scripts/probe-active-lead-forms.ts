/**
 * Compare lead form detection: current narrow scan vs adsets/campaigns/all ad statuses.
 * Run: npx tsx scripts/probe-active-lead-forms.ts
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { getMetaConfigRow, listMetaSyncableOrganizations } from "../lib/db/meta-config-repository"
import { listMetaLeadFormsForOrganization } from "../lib/db/meta-lead-forms-repository"
import { decryptSecret } from "../lib/meta/crypto"
import { findLeadgenFormIdsInActiveAds, listLeadgenForms } from "../lib/meta/leadgen-forms"
import { resolvePageAccessTokenForOrganization } from "../lib/meta/resolve-page-access-token"
import { fetchAllGraphPages, GRAPH_VERSION, resolveMetaAccessToken } from "../lib/meta/token"
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

function collectLeadGenFormIds(obj: unknown, out: Set<string>) {
  if (!obj || typeof obj !== "object") return
  if (Array.isArray(obj)) {
    for (const item of obj) collectLeadGenFormIds(item, out)
    return
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === "lead_gen_form_id" && (typeof value === "string" || typeof value === "number")) {
      out.add(String(value))
    } else {
      collectLeadGenFormIds(value, out)
    }
  }
}

async function fetchAds(
  adAccountId: string,
  token: string,
  effectiveStatus?: string
): Promise<{ count: number; formIds: Set<string>; sampleAd?: unknown }> {
  const normalized = adAccountId.replace(/^act_/i, "")
  const fields =
    "id,name,effective_status,creative{id,object_story_spec,effective_object_story_id,asset_feed_spec,object_type}"
  let url =
    `https://graph.facebook.com/${GRAPH_VERSION}/act_${normalized}/ads` +
    `?fields=${encodeURIComponent(fields)}&limit=100`
  if (effectiveStatus) {
    url += `&effective_status=${encodeURIComponent(effectiveStatus)}`
  }
  const ads = await fetchAllGraphPages<Record<string, unknown>>(url, token, 10)
  const formIds = new Set<string>()
  for (const ad of ads) collectLeadGenFormIds(ad, formIds)
  return { count: ads.length, formIds, sampleAd: ads[0] }
}

async function fetchAdSets(adAccountId: string, token: string) {
  const normalized = adAccountId.replace(/^act_/i, "")
  const fields =
    "id,name,effective_status,promoted_object,optimization_goal,destination_type"
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/act_${normalized}/adsets` +
    `?fields=${encodeURIComponent(fields)}&effective_status=['ACTIVE']&limit=100`
  const rows = await fetchAllGraphPages<Record<string, unknown>>(url, token, 10)
  const formIds = new Set<string>()
  for (const row of rows) collectLeadGenFormIds(row, formIds)
  return { count: rows.length, formIds, samples: rows.slice(0, 3) }
}

async function main() {
  loadEnvLocal()
  const supabase = createAdminClient()
  const orgs = await listMetaSyncableOrganizations(supabase)

  for (const org of orgs) {
    const row = await getMetaConfigRow(supabase, org.organizationId)
    if (!row?.enabled || !row.meta_ad_account_id?.trim() || !row.meta_page_id?.trim()) continue

    const { token: pageToken } = await resolvePageAccessTokenForOrganization(
      supabase,
      org.organizationId,
      { persist: false }
    )
    const systemResolved = resolveMetaAccessToken({
      metaSystemUserToken: row.meta_system_user_token_encrypted
        ? decryptSecret(row.meta_system_user_token_encrypted)
        : "",
    })
    const systemToken = systemResolved.token || resolveMetaAccessToken().token || pageToken

    console.log("\n======== ORG", org.organizationId, "========")
    console.log("ad_account:", row.meta_ad_account_id)
    console.log("page_id:", row.meta_page_id)

    const pageForms = await listLeadgenForms(row.meta_page_id, pageToken)
    const dbForms = await listMetaLeadFormsForOrganization(supabase, org.organizationId)
    const nameById = new Map<string, string>()
    for (const f of pageForms) nameById.set(f.id, f.name ?? f.id)
    for (const f of dbForms) nameById.set(f.meta_form_id, f.name)

    const narrow = await findLeadgenFormIdsInActiveAds(row.meta_ad_account_id, systemToken)
    console.log(
      "\nCurrent CRM scan (deep creative tree, ACTIVE ads only):",
      [...narrow].map((id) => `${nameById.get(id) ?? "?"} (${id})`)
    )

    for (const status of ["['ACTIVE']", "['ACTIVE','PAUSED']", undefined] as const) {
      const label = status ?? "(all statuses, no filter)"
      try {
        const ads = await fetchAds(row.meta_ad_account_id, systemToken, status)
        console.log(`\nAds ${label}: count=${ads.count}, form ids in creative tree=${ads.formIds.size}`)
        for (const id of ads.formIds) console.log("  ", nameById.get(id) ?? id)
        if (ads.count > 0 && ads.formIds.size === 0 && ads.sampleAd) {
          console.log("  sample creative keys:", JSON.stringify(ads.sampleAd).slice(0, 400))
        }
      } catch (error) {
        console.log(`Ads ${label}: ERROR`, error instanceof Error ? error.message.slice(0, 160) : error)
      }
    }

    try {
      const adsets = await fetchAdSets(row.meta_ad_account_id, systemToken)
      console.log(`\nAd sets ACTIVE: count=${adsets.count}, form ids in promoted_object=${adsets.formIds.size}`)
      for (const id of adsets.formIds) console.log("  ", nameById.get(id) ?? id)
      if (adsets.samples.length) {
        console.log("  sample adset promoted_object:", JSON.stringify(adsets.samples[0]?.promoted_object))
      }
    } catch (error) {
      console.log("Ad sets ERROR", error instanceof Error ? error.message.slice(0, 160) : error)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
