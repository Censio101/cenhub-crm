/**
 * Read-only probe: Meta token permissions, leadgen forms, sample field_data shape.
 * Run: npx tsx scripts/probe-meta-leadgen-access.ts
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { listMetaSyncableOrganizations } from "../lib/db/meta-config-repository"
import { decryptSecret } from "../lib/meta/crypto"
import { fetchMetaLeadsForOrganization } from "../lib/meta/fetch-leads"
import { getMetaConfigRow } from "../lib/db/meta-config-repository"
import {
  GRAPH_VERSION,
  graphFetch,
  resolveMetaAccessToken,
  tokenHint,
} from "../lib/meta/token"
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

async function safeGraph<T>(
  label: string,
  url: string,
  token: string
): Promise<{ ok: true; data: T } | { ok: false; label: string; error: string; code?: number }> {
  try {
    const data = await graphFetch<T>(url, token)
    return { ok: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const codeMatch = /code (\d+)/.exec(message)
    return {
      ok: false,
      label,
      error: message.slice(0, 280),
      code: codeMatch ? Number(codeMatch[1]) : undefined,
    }
  }
}

async function main() {
  loadEnvLocal()

  const appId = process.env.META_APP_ID?.trim() || "(not set)"
  const businessId = process.env.META_BUSINESS_ID?.trim() || "(not set)"
  const webhookVerify = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim()
    ? "(set)"
    : "(missing)"

  const systemRaw =
    process.env.META_SYSTEM_USER_TOKEN_V2 || process.env.META_SYSTEM_USER_TOKEN || ""
  const systemResolved = resolveMetaAccessToken({ metaSystemUserToken: systemRaw })

  console.log("=== Meta environment (no secrets) ===")
  console.log("GRAPH_VERSION:", GRAPH_VERSION)
  console.log("META_APP_ID:", appId)
  console.log("META_BUSINESS_ID:", businessId)
  console.log("META_WEBHOOK_VERIFY_TOKEN:", webhookVerify)
  console.log(
    "System user token:",
    systemResolved.token ? tokenHint(systemResolved.token) : systemResolved.reason
  )

  if (!systemResolved.token) {
    console.log("\nNo system token — skipping Graph probes.")
    process.exit(1)
  }

  const token = systemResolved.token

  console.log("\n=== System token Graph probes ===")

  const me = await safeGraph<{ id: string; name?: string }>(
    "me",
    `https://graph.facebook.com/${GRAPH_VERSION}/me?fields=id,name`,
    token
  )
  console.log("GET /me:", me.ok ? { id: me.data.id, name: me.data.name } : me)

  const debug = await safeGraph<{
    data?: {
      app_id?: string
      type?: string
      is_valid?: boolean
      expires_at?: number
      scopes?: string[]
      granular_scopes?: Array<{ scope?: string; target_ids?: string[] }>
    }
  }>(
    "debug_token",
    `https://graph.facebook.com/${GRAPH_VERSION}/debug_token?input_token=${encodeURIComponent(token)}`,
    token
  )
  if (debug.ok && debug.data.data) {
    const d = debug.data.data
    console.log("debug_token:", {
      app_id: d.app_id,
      type: d.type,
      is_valid: d.is_valid,
      expires_at: d.expires_at,
      scopes: d.scopes ?? [],
      granular_scopes: (d.granular_scopes ?? []).map((g) => ({
        scope: g.scope,
        target_count: g.target_ids?.length ?? 0,
      })),
    })
  } else if (!debug.ok) {
    console.log("debug_token:", debug)
  }

  const perm = await safeGraph<{ data?: Array<{ permission: string; status: string }> }>(
    "me/permissions",
    `https://graph.facebook.com/${GRAPH_VERSION}/me/permissions`,
    token
  )
  if (perm.ok) {
    const granted = (perm.data.data ?? []).filter((p) => p.status === "granted").map((p) => p.permission)
    console.log("granted permissions:", granted)
    const leadRelated = granted.filter((p) =>
      /lead|page|ads|business|manage/i.test(p)
    )
    console.log("lead/page related:", leadRelated)
  } else {
    console.log("me/permissions:", perm)
  }

  let supabase
  try {
    supabase = createAdminClient()
  } catch (error) {
    console.log("\nSupabase admin client unavailable:", error instanceof Error ? error.message : error)
    process.exit(0)
  }

  const orgs = await listMetaSyncableOrganizations(supabase)
  console.log("\n=== Clients with Meta enabled in DB ===", orgs.length)

  for (const org of orgs) {
    const row = await getMetaConfigRow(supabase, org.organizationId)
    if (!row) continue

    const resolved = resolveMetaAccessToken({
      metaSystemUserToken: row.meta_system_user_token_encrypted
        ? decryptSecret(row.meta_system_user_token_encrypted)
        : "",
      metaPageAccessToken: row.meta_page_access_token_encrypted
        ? decryptSecret(row.meta_page_access_token_encrypted)
        : "",
    })

    const pageId = String(row.meta_page_id || "").trim()
    console.log("\n--- org", org.organizationId.slice(0, 8) + "… ---")
    console.log("ad_account:", org.metaAdAccountId || "(none)")
    console.log("page_id:", pageId || "(none)")
    console.log(
      "token used:",
      resolved.token ? tokenHint(resolved.token) : resolved.reason ?? "none"
    )

    const useToken = resolved.token ?? token
    if (!pageId) {
      console.log("skip leadgen: no page_id")
      continue
    }

    const formsUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/leadgen_forms?fields=id,name,status,leads_count,created_time`
    const formsRes = await safeGraph<{
      data?: Array<{ id: string; name?: string; status?: string; leads_count?: number }>
    }>("leadgen_forms", formsUrl, useToken)
    if (!formsRes.ok) {
      console.log("leadgen_forms:", formsRes)
      continue
    }
    const forms = formsRes.data.data ?? []
    console.log("leadgen_forms count:", forms.length)
    for (const form of forms.slice(0, 5)) {
      console.log("  form:", {
        id: form.id,
        name: form.name,
        status: form.status,
        leads_count: form.leads_count,
      })

      const qUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${form.id}?fields=id,name,questions`
      const qRes = await safeGraph<{
        id?: string
        name?: string
        questions?: Array<{
          id?: string
          key?: string
          label?: string
          type?: string
        }>
      }>("form_questions", qUrl, useToken)
      if (qRes.ok && qRes.data.questions) {
        console.log(
          "    questions:",
          qRes.data.questions.map((q) => ({
            key: q.key,
            label: q.label,
            type: q.type,
          }))
        )
      } else if (!qRes.ok) {
        console.log("    questions error:", qRes.error.slice(0, 120))
      }

      const sampleLeadUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${form.id}/leads?fields=id,created_time,field_data,ad_id&limit=1`
      const sampleRes = await safeGraph<{
        data?: Array<{
          id: string
          created_time?: string
          ad_id?: string
          field_data?: Array<{ name: string; values?: string[] }>
        }>
      }>("sample_lead", sampleLeadUrl, useToken)
      if (sampleRes.ok && sampleRes.data.data?.[0]) {
        const lead = sampleRes.data.data[0]
        console.log("    sample lead id:", lead.id)
        console.log(
          "    field_data names:",
          (lead.field_data ?? []).map((f) => ({
            name: f.name,
            sample: f.values?.[0]?.slice(0, 40) ?? "",
          }))
        )
      } else if (sampleRes.ok) {
        console.log("    sample lead: (none yet)")
      } else {
        console.log("    sample lead error:", sampleRes.error.slice(0, 120))
      }
    }
    if (forms.length > 5) console.log(`  … and ${forms.length - 5} more forms`)

    try {
      const leads = await fetchMetaLeadsForOrganization(row, {
        withFields: true,
        daysBack: 14,
      })
      console.log("fetchMetaLeadsForOrganization (14d):", leads.length, "leads")
      if (leads[0]?.field_data) {
        console.log(
          "  newest field keys:",
          leads[0].field_data.map((f) => f.name)
        )
      }
    } catch (error) {
      console.log(
        "fetchMetaLeadsForOrganization error:",
        error instanceof Error ? error.message.slice(0, 160) : error
      )
    }

    const subUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/subscribed_apps`
    const subRes = await safeGraph<{ data?: Array<{ id?: string; name?: string; subscribed_fields?: string[] }> }>(
      "subscribed_apps",
      subUrl,
      useToken
    )
    if (subRes.ok) {
      console.log(
        "page subscribed_apps:",
        (subRes.data.data ?? []).map((a) => ({
          id: a.id,
          fields: a.subscribed_fields,
        }))
      )
    } else {
      console.log("subscribed_apps:", subRes.error.slice(0, 120))
    }
  }

  console.log("\n=== Done ===")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
