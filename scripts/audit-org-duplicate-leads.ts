/**
 * List leads that share email or phone (last 8 digits) within one org.
 * Run: npx tsx scripts/audit-org-duplicate-leads.ts [slug]
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

import { getOrganizationBySlug } from "../lib/db/organizations-repository"
import { leadRowToLead } from "../lib/db/lead-mapper"
import type { LeadRow } from "../lib/db/types"
import { phoneMatchKey } from "../lib/leads/duplicates"
import type { Lead } from "../lib/leads"
import { createAdminClient } from "../lib/supabase/admin"

const slug = process.argv[2] ?? "familien-l-kke"

async function main() {
  const admin = createAdminClient()
  const org = await getOrganizationBySlug(admin, slug)
  if (!org) {
    console.error("Org not found:", slug)
    process.exit(1)
  }
  const { data, error } = await admin
    .from("leads")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: true })
  if (error) throw error
  const rows = (data ?? []) as LeadRow[]
  const leads: (Lead & { importId: string | null; source: string; createdAt: string })[] = rows.map(
    (row) => ({
      ...leadRowToLead(row),
      importId: row.import_id,
      source: row.source,
      createdAt: row.created_at,
    })
  )

  const byEmail = new Map<string, typeof leads>()
  const byPhone = new Map<string, typeof leads>()
  for (const lead of leads) {
    const email = lead.email?.trim().toLowerCase()
    if (email?.includes("@")) {
      const list = byEmail.get(email) ?? []
      list.push(lead)
      byEmail.set(email, list)
    }
    const pk = phoneMatchKey(lead.phone)
    if (pk) {
      const list = byPhone.get(pk) ?? []
      list.push(lead)
      byPhone.set(pk, list)
    }
  }

  type Group = { key: string; kind: "email" | "phone"; leads: typeof leads }
  const groups = new Map<string, Group>()
  for (const [key, list] of byEmail) {
    if (list.length > 1) groups.set(`e:${key}`, { key, kind: "email", leads: list })
  }
  for (const [key, list] of byPhone) {
    if (list.length > 1) {
      const id = `p:${key}`
      if (!groups.has(id)) groups.set(id, { key, kind: "phone", leads: list })
    }
  }

  const importIds = new Set<string>()
  let emptyServicePairs = 0

  console.log("Org:", org.name, "total leads:", leads.length)
  console.log("Duplicate contact groups:", groups.size)
  console.log("---")

  for (const group of groups.values()) {
    const ids = new Set(group.leads.map((l) => l.id))
    if (ids.size < 2) continue
    const hasEmpty = group.leads.some((l) => l.serviceIds.length === 0)
    const hasFull = group.leads.some((l) => l.serviceIds.length > 0)
    if (hasEmpty && hasFull) emptyServicePairs += 1
    for (const l of group.leads) {
      if (l.importId) importIds.add(l.importId)
    }
    console.log(
      `[${group.kind}] ${group.key} — ${group.leads.length} leads`,
      group.leads.map((l) => ({
        id: l.id.slice(0, 8),
        source: l.source,
        services: l.serviceIds,
        importId: l.importId?.slice(0, 8) ?? null,
        created: l.date,
      }))
    )
  }

  console.log("---")
  console.log("Groups with empty-service + filled-service twin:", emptyServicePairs)
  console.log("Distinct import_id on duplicated rows:", importIds.size)
  const recentImport = process.argv[3]
  if (recentImport) {
    const prefix = recentImport
    const fromImport = leads.filter((l) => l.importId?.startsWith(prefix))
    console.log(`Leads with import_id prefix ${prefix}:`, fromImport.length)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
