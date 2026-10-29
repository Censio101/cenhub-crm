/**
 * Read-only audit: re-computes every dashboard number from the raw leads and monthly ad spend
 * for every client and compares it with what the dashboard engine shows (KPI cards, chart,
 * comparison, service/funnel split, 12-month table).
 *
 * Run: npm run db:audit-dashboard-consistency
 * Optional: AUDIT_ORG_SLUG=<slug> to check one client.
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

import { listAdSpendByMonth } from "../lib/db/ad-metrics-repository"
import { listLeadsForOrganization } from "../lib/db/leads-repository"
import { runConsistencyAudit } from "../lib/performance/consistency-check"
import { createAdminClient } from "../lib/supabase/admin"

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

async function main() {
  const admin = createAdminClient()
  const only = process.env.AUDIT_ORG_SLUG?.trim()
  let query = admin.from("organizations").select("id, slug").order("slug")
  if (only) query = query.eq("slug", only)
  const { data: orgs, error } = await query
  if (error) throw error

  let failedClients = 0
  for (const org of orgs ?? []) {
    const [{ adSpendByMonth }, leads] = await Promise.all([
      listAdSpendByMonth(admin, org.id),
      listLeadsForOrganization(admin, org.id),
    ])
    if (leads.length === 0 && Object.keys(adSpendByMonth).length === 0) continue

    const issues = runConsistencyAudit({ leads, adSpendByMonth })
    const label = `${org.slug} (${leads.length} leads, ${Object.keys(adSpendByMonth).length} ad months)`
    if (issues.length === 0) {
      console.log(`PASS  ${label}`)
      continue
    }
    failedClients += 1
    console.log(`FAIL  ${label} - ${issues.length} mismatches`)
    for (const issue of issues.slice(0, 40)) {
      console.log(
        `        [${issue.scope}] ${issue.check}: expected ${fmt(issue.expected)}, dashboard ${fmt(issue.actual)}`
      )
    }
    if (issues.length > 40) console.log(`        ... and ${issues.length - 40} more`)
  }

  console.log(failedClients === 0 ? "\nAll clients consistent." : `\n${failedClients} client(s) with mismatches.`)
  process.exitCode = failedClients === 0 ? 0 : 1
}

void main()
