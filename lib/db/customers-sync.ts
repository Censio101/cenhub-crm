import type { SupabaseClient } from "@supabase/supabase-js"

import type { LeadRow } from "@/lib/db/types"

function mapLeadSourceToCustomerSource(platform: string): string {
  if (platform === "meta") return "facebook"
  if (platform === "website") return "website"
  if (platform === "landing") return "landing"
  return "other"
}

export async function syncCustomerForWonLead(
  supabase: SupabaseClient,
  lead: LeadRow
): Promise<void> {
  if (lead.status !== "won") {
    await supabase.from("customers").delete().eq("lead_id", lead.id)
    return
  }

  const segment = lead.segment === "b2b" ? "b2b" : "b2c"
  const salesPrice = lead.sales_price ?? 0
  const profit = lead.profit ?? 0

  const payload = {
    organization_id: lead.organization_id,
    lead_id: lead.id,
    closed_date: lead.lead_date,
    full_name: lead.full_name,
    email: lead.email,
    phone: lead.phone,
    segment,
    company_name: lead.company_name,
    address: lead.address,
    zip_code: lead.zip_code,
    city: lead.city,
    service_ids: lead.service_ids,
    sales_price: salesPrice,
    profit,
    source: mapLeadSourceToCustomerSource(lead.platform),
  }

  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("lead_id", lead.id)
    .maybeSingle()

  if (existing?.id) {
    await supabase.from("customers").update(payload).eq("id", existing.id)
    return
  }

  await supabase.from("customers").insert(payload)
}
