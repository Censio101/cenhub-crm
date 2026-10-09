import type { LeadPatch } from "@/lib/db/lead-mapper"
import type { Lead } from "@/lib/leads"

function stringFilled(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0
}

/** Whether the lead already has a value in this field. */
export function leadFieldHasValue(lead: Lead, field: keyof LeadPatch): boolean {
  switch (field) {
    case "date":
      return stringFilled(lead.date)
    case "time":
      return lead.time != null && String(lead.time).trim().length > 0
    case "fullName":
      return stringFilled(lead.fullName)
    case "email":
      return stringFilled(lead.email)
    case "phone":
      return stringFilled(lead.phone)
    case "segment":
      return stringFilled(lead.segment)
    case "companyName":
      return stringFilled(lead.companyName)
    case "address":
      return stringFilled(lead.address)
    case "zipCode":
      return stringFilled(lead.zipCode)
    case "city":
      return stringFilled(lead.city)
    case "metaAdId":
      return stringFilled(lead.metaAdId)
    case "salesPrice":
      return lead.salesPrice != null
    case "profit":
      return lead.profit != null
    default:
      return false
  }
}
