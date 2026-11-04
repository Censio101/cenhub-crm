/**
 * Scantherm Session afbrudt smoke test (production webhook).
 *
 * - Beregning (`beregningsskema`, data format "ours"): sends `customFields.session_status`
 *   as `abandoned` and as legacy `Ja` (both should display **Abandoned** in the sheet).
 * - Quick-Heat B2B: only mapped fields are ingested; session is not mapped today unless you
 *   add `customFields.session_status` in Admin → Funnels.
 *
 * Run: npx tsx scripts/scantherm-session-status-test-leads.ts
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
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

import { listLeadFunnelsForOrganization } from "@/lib/db/lead-funnels-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { createAdminClient } from "@/lib/supabase/admin"

const ORG_SLUG = "scantherm-aps"
const BEREGNING_SLUG = "beregningsskema"
const B2B_SLUG = "quick-heat-trailer-b2b"
const CRM_BASE = process.env.CRM_PUBLIC_URL?.replace(/\/$/, "") ?? "https://www.cenhub.dk"

async function postLead(
  funnelId: string,
  secret: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`${CRM_BASE}/api/webhooks/funnels/${funnelId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
  return { status: res.status, json }
}

async function main() {
  const admin = createAdminClient()
  const org = await getOrganizationBySlug(admin, ORG_SLUG)
  if (!org) {
    console.error(`Organization not found: ${ORG_SLUG}`)
    process.exit(1)
  }

  const funnels = await listLeadFunnelsForOrganization(admin, org.id)
  const beregning = funnels.find((f) => f.slug === BEREGNING_SLUG)
  const b2b = funnels.find((f) => f.slug === B2B_SLUG)

  if (!beregning) {
    console.error(`Funnel not found: ${BEREGNING_SLUG}`)
    process.exit(1)
  }

  const stamp = Date.now()
  const baseLead = {
    phone: "87654321",
    leadDate: "2026-11-04",
  }

  const abandonedBody = {
    ...baseLead,
    fullName: `Session test abandoned (${stamp})`,
    email: `session-abandoned-${stamp}@example.com`,
    customFields: { session_status: "abandoned" },
  }

  const jaBody = {
    ...baseLead,
    fullName: `Session test Ja (${stamp})`,
    email: `session-ja-${stamp}@example.com`,
    customFields: { session_status: "Ja" },
  }

  const nejBody = {
    ...baseLead,
    fullName: `Session test Nej (${stamp})`,
    email: `session-nej-${stamp}@example.com`,
    customFields: { session_status: "Nej" },
  }

  const rAbandoned = await postLead(beregning.id, beregning.webhook_secret, abandonedBody)
  const rJa = await postLead(beregning.id, beregning.webhook_secret, jaBody)
  const rNej = await postLead(beregning.id, beregning.webhook_secret, nejBody)

  let b2bNote: string | undefined
  if (b2b) {
    const b2bMapping = (b2b.field_mapping ?? {}) as Record<string, string>
    if (b2bMapping["customFields.session_status"]) {
      const b2bJa = {
        Dato: "2026-11-04",
        "Fulde navn": `Session test Ja B2B (${stamp})`,
        "E-mail": `session-ja-b2b-${stamp}@example.com`,
        Telefon: "87654322",
        "Virksomheds navn": "Session Test ApS",
        Note: "Ja on mapped Session field",
        [b2bMapping["customFields.session_status"]]: "Ja",
      }
      const rB2b = await postLead(b2b.id, b2b.webhook_secret, b2bJa)
      b2bNote = `B2B Ja test status ${rB2b.status}`
    } else {
      b2bNote =
        "Quick-Heat B2B has no session_status mapping — skipped Ja on that funnel. Add customFields.session_status in Admin if the trailer form sends it."
    }
  }

  console.log(
    JSON.stringify(
      {
        funnel: { slug: beregning.slug, label: beregning.sheet_source_label },
        leads: [
          {
            email: abandonedBody.email,
            sent: "abandoned",
            expectedColumn: "Abandoned",
            ...rAbandoned,
          },
          {
            email: jaBody.email,
            sent: "Ja",
            expectedColumn: "Abandoned",
            ...rJa,
          },
          {
            email: nejBody.email,
            sent: "Nej",
            expectedColumn: "Nej",
            ...rNej,
          },
        ],
        b2bNote,
        verify:
          "Leads → Leadformular → Beregning → column Session afbrudt (search by email above)",
      },
      null,
      2
    )
  )

  for (const r of [rAbandoned, rJa, rNej]) {
    if (r.status !== 201 && r.status !== 200) process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
