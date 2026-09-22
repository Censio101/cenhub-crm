/**
 * Backfill customers table from existing won leads.
 * Run: npx tsx scripts/backfill-customers.ts [org-slug]
 */
import "dotenv/config"

import { createClient } from "@supabase/supabase-js"

import { syncCustomerForWonLead } from "../lib/db/customers-sync"
import type { LeadRow } from "../lib/db/types"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error("Missing Supabase env vars")
  process.exit(1)
}

const supabase = createClient(url, key)
const slug = process.argv[2] ?? "nordkystens-tomrer"

async function main() {
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .single()

  if (orgError || !org) {
    console.error("Organization not found:", slug)
    process.exit(1)
  }

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("*")
    .eq("organization_id", org.id)
    .eq("status", "won")

  if (leadsError) throw leadsError

  let synced = 0
  for (const lead of (leads ?? []) as LeadRow[]) {
    await syncCustomerForWonLead(supabase, lead)
    synced += 1
  }

  console.log(`Backfilled ${synced} customers for ${org.name} (${org.slug})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
