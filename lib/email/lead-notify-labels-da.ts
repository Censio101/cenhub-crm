import type { BuiltinColumnKey } from "@/lib/lead-sheet/types"

/** Danish column labels for outbound lead emails (always Danish, not UI locale). */
export const LEAD_NOTIFY_BUILTIN_LABELS_DA: Record<BuiltinColumnKey, string> = {
  date: "Lead-dato",
  fullName: "Fulde navn",
  email: "E-mail",
  phone: "Telefon",
  segment: "Privat/Erhverv",
  companyName: "Virksomhed",
  address: "Adresse",
  zipCode: "Postnr.",
  city: "By",
  serviceIds: "Service",
  metaAdId: "Meta kunde annonce ID",
  status: "Status",
  wonDate: "Vundet d.",
  salesPrice: "Salgspris",
  profit: "Bundlinje",
  ltv: "LTV",
}

export function builtinLabelDa(key: BuiltinColumnKey): string {
  return LEAD_NOTIFY_BUILTIN_LABELS_DA[key]
}
