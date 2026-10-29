import type { LeadRow } from "@/lib/db/types"
import { createAdminClient } from "@/lib/supabase/admin"

function mapLeadSourceToCustomerSource(platform: string): string {
  if (platform === "meta") return "facebook"
  if (platform === "website") return "website"
  if (platform === "landing") return "landing"
  return "other"
}

/** The customer row that belongs to a won lead. */
export function customerPayloadFromLead(lead: LeadRow) {
  return {
    organization_id: lead.organization_id,
    lead_id: lead.id,
    closed_date: lead.won_date ?? lead.lead_date,
    full_name: lead.full_name,
    email: lead.email,
    phone: lead.phone,
    segment: lead.segment === "b2b" ? "b2b" : "b2c",
    company_name: lead.company_name,
    address: lead.address,
    zip_code: lead.zip_code,
    city: lead.city,
    service_ids: lead.service_ids,
    sales_price: lead.sales_price ?? 0,
    profit: lead.profit ?? 0,
    source: mapLeadSourceToCustomerSource(lead.platform),
  }
}

/**
 * Keeps the customer row of a lead in step with its status. Customer rows are derived data, so
 * they are written with the server's service role (clients can only read them), no matter whose
 * session triggered the change.
 */
export async function syncCustomerForWonLead(lead: LeadRow): Promise<void> {
  const supabase = createAdminClient()
  if (lead.status !== "won") {
    await supabase.from("customers").delete().eq("lead_id", lead.id)
    return
  }

  const payload = customerPayloadFromLead(lead)

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
