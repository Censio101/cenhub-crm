import type { ImportLeadPreview } from "@/lib/import/types"
import { formatLeadDateTime } from "@/lib/leads/lead-datetime"
import { resolveServiceLabel } from "@/lib/performance/services"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import type { MessageKey } from "@/lib/i18n"

type T = (key: MessageKey) => string

function moneyText(value: number | null): string {
  return value === null ? "" : value.toLocaleString("da-DK")
}

function customText(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") {
    const link = value as { text?: unknown; url?: unknown }
    return String(link.text || link.url || "")
  }
  return String(value)
}

/** How one lead sheet column shows a lead that has not been saved yet. */
export function previewCellText(
  column: LeadSheetTemplateColumn,
  lead: ImportLeadPreview,
  t: T
): string {
  if (column.kind === "custom") return customText(lead.customFields[column.customField.fieldKey])

  switch (column.builtinKey) {
    case "date":
      return formatLeadDateTime(lead.date, lead.time)
    case "fullName":
      return lead.fullName
    case "email":
      return lead.email
    case "phone":
      return lead.phone
    case "segment":
      return lead.segment ? t(`leadSegment_${lead.segment}` as MessageKey) : ""
    case "companyName":
      return lead.companyName
    case "address":
      return lead.address
    case "zipCode":
      return lead.zipCode
    case "city":
      return lead.city
    case "serviceIds":
      return lead.serviceIds.map((id) => resolveServiceLabel(id)).join(", ")
    case "status":
      return t(`leadStatus_${lead.status}` as MessageKey)
    case "salesPrice":
      return moneyText(lead.salesPrice)
    case "profit":
      return moneyText(lead.profit)
    default:
      return ""
  }
}
