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

export function customerRowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
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
  }
}

export async function listCustomersForOrganization(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", organizationId)
    .order("closed_date", { ascending: false })

  if (error) throw error
  return ((data ?? []) as CustomerRow[]).map(customerRowToCustomer)
}

export function listMockCustomers(): Customer[] {
  return MOCK_CUSTOMERS
}
