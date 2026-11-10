/**
 * Switch Navergruppen Meta funnel to mapping mode and seed field paths + service aliases.
 * Run: npx tsx scripts/ensure-navergruppen-meta-mapping-funnel.ts
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

import {
  NAVERGRUPPEN_META_FIELD_MAPPING,
  NAVERGRUPPEN_META_SERVICE_ALIASES,
} from "@/lib/funnels/navergruppen-meta-funnel-preset"
import { listLeadFunnelsForOrganization, updateLeadFunnel } from "@/lib/db/lead-funnels-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import {
  listOrganizationServiceAliases,
  saveOrganizationServiceAliases,
} from "@/lib/db/service-aliases-repository"
import { getOrganizationServicesView } from "@/lib/db/services-repository"
import { createAdminClient } from "@/lib/supabase/admin"

const ORG_SLUG = "navergruppen-a-s"
const FUNNEL_SLUG = "b2b-b2c-funnel-if-censio"

async function main() {
  const admin = createAdminClient()
  const org = await getOrganizationBySlug(admin, ORG_SLUG)
  if (!org) {
    console.error(`Organization not found: ${ORG_SLUG}`)
    process.exit(1)
  }

  const funnels = await listLeadFunnelsForOrganization(admin, org.id)
  const funnel = funnels.find((f) => f.slug === FUNNEL_SLUG)
  if (!funnel) {
    console.error(`Funnel not found: ${FUNNEL_SLUG}`)
    process.exit(1)
  }

  await updateLeadFunnel(admin, funnel.id, org.id, {
    dataFormat: "own",
    fieldMapping: { ...NAVERGRUPPEN_META_FIELD_MAPPING },
  })

  const servicesView = await getOrganizationServicesView(admin, org.id)
  const slugToUuid = new Map(
    [...servicesView.catalog, ...servicesView.manual].map((s) => [s.slug, s.id] as const)
  )
  const existing = await listOrganizationServiceAliases(admin, org.id)
  const byNorm = new Map(
    existing.map((row) => [
      row.alias.toLowerCase(),
      { alias: row.alias, serviceId: row.serviceId },
    ])
  )
  for (const row of NAVERGRUPPEN_META_SERVICE_ALIASES) {
    const uuid = slugToUuid.get(row.slug)
    if (!uuid) {
      console.warn(`Service slug missing: ${row.slug}`)
      continue
    }
    byNorm.set(row.alias.toLowerCase(), { alias: row.alias, serviceId: uuid })
  }
  await saveOrganizationServiceAliases(admin, org.id, [...byNorm.values()], servicesView.selectedIds)

  console.log(JSON.stringify({ ok: true, funnelId: funnel.id, dataFormat: "own" }, null, 2))
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
