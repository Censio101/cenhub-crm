import type { SupabaseClient } from "@supabase/supabase-js"

import type { CustomerRow } from "@/lib/db/types"
import {
  MOCK_CUSTOMERS,
  type Customer,
  type CustomerSourceId,
} from "@/lib/customers"

function mapDbSource(source: string): CustomerSourceId {
  if (
    source === "facebook" ||
    source === "instagram" ||
    source === "website" ||
    source === "landing" ||
    source === "referral" ||
    source === "repeat"
  ) {
    return source
  }
  return "website"
}

type CustomerRowWithLead = CustomerRow & {
  leads?: { custom_fields: Record<string, unknown> | null } | null
}

export function customerRowToCustomer(row: CustomerRowWithLead): Customer {
  return {
    id: row.id,
    leadId: row.lead_id,
    closedDate: row.closed_date,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    segment: row.segment === "b2b" ? "b2b" : "b2c",
    companyName: row.company_name,
    address: row.address,
    zipCode: row.zip_code,
    city: row.city,
    serviceIds: row.service_ids ?? [],
    salesPrice: Number(row.sales_price),
    profit: Number(row.profit),
    source: mapDbSource(row.source),
    customFields: row.leads?.custom_fields ?? {},
  }
}

export async function listCustomersForOrganization(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*, leads ( custom_fields )")
    .eq("organization_id", organizationId)
    .order("closed_date", { ascending: false })

  if (error) throw error
  return ((data ?? []) as CustomerRowWithLead[]).map(customerRowToCustomer)
}

export function listMockCustomers(): Customer[] {
  return MOCK_CUSTOMERS
}
