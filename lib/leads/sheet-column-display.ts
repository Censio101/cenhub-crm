import { columnDisplayLabel } from "@/lib/lead-sheet/column-display-label"
import { leadSegmentLabelKey, leadStatusLabelKey } from "@/lib/lead-sheet/lead-labels"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import type { MessageKey } from "@/lib/i18n"
import { formatLeadServices, type Lead } from "@/lib/leads"
import { formatLeadDateTime } from "@/lib/leads/lead-datetime"
import type { NamedService } from "@/lib/performance/services"

/** Plain text shown in a cell (for auto-fit, compact mode, tooltips). */
export function leadSheetCellDisplayText(
  lead: Lead,
  col: LeadSheetTemplateColumn,
  ctx: {
    t: (key: MessageKey) => string
    enabledServices: readonly NamedService[]
  }
): string {
  if (col.kind === "custom") {
    const value = lead.customFields?.[col.customField.fieldKey]
    if (value == null || value === "") return ""
    if (typeof value === "string") return value.trim()
    if (typeof value === "number") return String(value)
    if (typeof value === "object" && value !== null && "url" in value) {
      const link = value as { text?: string; url?: string }
      return (link.text || link.url || "").trim()
    }
    return String(value)
  }

  switch (col.builtinKey) {
    case "date":
      return formatLeadDateTime(lead.date, lead.time)
    case "wonDate":
      return lead.status === "won" && lead.wonDate ? formatLeadDateTime(lead.wonDate, null) : ""
    case "fullName":
      return lead.fullName.trim()
    case "email":
      return lead.email.trim()
    case "phone":
      return lead.phone.trim()
    case "segment":
      return lead.segment ? ctx.t(leadSegmentLabelKey(lead.segment)) : ""
    case "companyName":
      return lead.companyName.trim()
    case "address":
      return lead.address.trim()
    case "zipCode":
      return lead.zipCode.trim()
    case "city":
      return lead.city.trim()
    case "serviceIds":
      return formatLeadServices(lead, ctx.enabledServices)
    case "metaAdId":
      return lead.metaAdId.trim()
    case "status":
      return ctx.t(leadStatusLabelKey(lead.status))
    case "salesPrice":
      return lead.salesPrice == null ? "" : String(lead.salesPrice)
    case "profit":
      return lead.profit == null ? "" : String(lead.profit)
    case "ltv":
      return lead.ltv == null ? "" : String(lead.ltv)
    default:
      return ""
  }
}

export function columnHasAnyVisibleValue(
  col: LeadSheetTemplateColumn,
  leads: readonly Lead[],
  ctx: {
    t: (key: MessageKey) => string
    enabledServices: readonly NamedService[]
  }
): boolean {
  for (const lead of leads) {
    if (leadSheetCellDisplayText(lead, col, ctx)) return true
  }
  return false
}

export function headerDisplayText(
  col: LeadSheetTemplateColumn,
  t: (key: MessageKey) => string
): string {
  return columnDisplayLabel(col, t)
}
