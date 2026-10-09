import type { BuiltinColumnKey } from "@/lib/lead-sheet/types"
import type { MessageKey } from "@/lib/i18n"
import type { LeadSegmentId, LeadSource, LeadStatusId } from "@/lib/leads"

const BUILTIN_LABEL_KEYS: Record<BuiltinColumnKey, MessageKey> = {
  date: "leadSheetColDate",
  fullName: "leadSheetColFullName",
  email: "leadSheetColEmail",
  phone: "leadSheetColPhone",
  segment: "leadSheetColSegment",
  companyName: "leadSheetColCompanyName",
  address: "leadSheetColAddress",
  zipCode: "leadSheetColZipCode",
  city: "leadSheetColCity",
  serviceIds: "leadSheetColServiceIds",
  metaAdId: "leadSheetColMetaAdId",
  status: "leadSheetColStatus",
  salesPrice: "leadSheetColSalesPrice",
  profit: "leadSheetColProfit",
}

export function builtinColumnLabelKey(key: BuiltinColumnKey): MessageKey {
  return BUILTIN_LABEL_KEYS[key]
}

export function leadStatusLabelKey(id: LeadStatusId): MessageKey {
  return `leadStatus_${id}` as MessageKey
}

export function leadSourceLabelKey(source: LeadSource): MessageKey {
  return `leadSheetSource_${source}` as MessageKey
}

export function leadSegmentLabelKey(id: LeadSegmentId): MessageKey {
  return id === "b2c" ? "leadSegment_b2c" : "leadSegment_b2b"
}
