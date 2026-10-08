import type { MessageKey } from "@/lib/i18n"
import { buildImageLinkValue } from "@/lib/lead-sheet/image-link"
import { imageLinkErrorMessageKey } from "@/lib/lead-sheet/image-link-messages"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import { isEmptyCustomFieldValue } from "@/lib/lead-sheet/validate"
import type { Lead } from "@/lib/leads"
import { parseLeadDateTime } from "@/lib/leads/lead-datetime"
import { isOnboardingContactEmailValid } from "@/lib/onboarding/application-input"

type CustomColumn = Extract<LeadSheetTemplateColumn, { kind: "custom" }>

/** Name, email and phone must be filled in when adding a lead by hand (senders and forms only warn). */
export const REQUIRED_NEW_LEAD_BUILTINS = ["fullName", "email", "phone"] as const

/** Built-in fields in the order they are shown, grouped into sections. Only those on the sheet appear. */
export const NEW_LEAD_CONTACT_KEYS = ["fullName", "email", "phone"] as const
export const NEW_LEAD_COMPANY_KEYS = ["companyName", "address", "zipCode", "city"] as const
export const NEW_LEAD_DETAIL_KEYS = [
  "date",
  "status",
  "segment",
  "serviceIds",
  "salesPrice",
  "profit",
] as const

export type NewLeadSections = {
  contact: string[]
  company: string[]
  details: string[]
  /** Template-specific custom columns, in the sheet's order. */
  custom: CustomColumn[]
}

/** Which fields the popup shows, driven entirely by the lead sheet's columns. */
export function groupNewLeadColumns(columns: readonly LeadSheetTemplateColumn[]): NewLeadSections {
  const builtins = new Set<string>(
    columns.flatMap((col) => (col.kind === "builtin" ? [col.builtinKey] : []))
  )
  const pick = (keys: readonly string[]) => keys.filter((key) => builtins.has(key))
  return {
    contact: pick(NEW_LEAD_CONTACT_KEYS),
    company: pick(NEW_LEAD_COMPANY_KEYS),
    details: pick(NEW_LEAD_DETAIL_KEYS),
    custom: columns.flatMap((col) => (col.kind === "custom" ? [col] : [])),
  }
}

export type NewLeadValidation =
  | { ok: true; lead: Lead }
  | { ok: false; errors: Record<string, MessageKey> }

/**
 * Validates the popup's draft against the sheet and returns the lead to create.
 * Errors are keyed by field (`fullName`, `date`, or a custom `fieldKey`) and hold message keys.
 */
export function validateNewLead({
  draft,
  dateText,
  columns,
  mode = "create",
}: {
  draft: Lead
  dateText: string
  columns: readonly LeadSheetTemplateColumn[]
  /**
   * `create` enforces the required fields. `edit` is lenient for existing leads (an older lead
   * may legitimately lack a phone number or a newly required column) but still checks that
   * filled values are valid.
   */
  mode?: "create" | "edit"
}): NewLeadValidation {
  const errors: Record<string, MessageKey> = {}
  const customFields: Record<string, unknown> = { ...draft.customFields }
  const builtins = new Set<string>(
    columns.flatMap((col) => (col.kind === "builtin" ? [col.builtinKey] : []))
  )
  const enforceRequired = mode === "create"

  if (enforceRequired) {
    for (const key of REQUIRED_NEW_LEAD_BUILTINS) {
      if (!draft[key].trim()) errors[key] = "leadSheetFieldRequired"
    }
  }
  // An empty email is already flagged above in create mode; edit mode only checks filled ones.
  if (!errors.email && draft.email.trim() && !isOnboardingContactEmailValid(draft.email)) {
    errors.email = "leadSheetEmailInvalid"
  }

  const parsedDate = parseLeadDateTime(dateText)
  if (!parsedDate && builtins.has("date")) errors.date = "leadSheetDateInvalid"

  for (const col of columns) {
    if (col.kind !== "custom") continue
    const { fieldKey, fieldType, required } = col.customField
    const raw = customFields[fieldKey]

    if (fieldType === "image") {
      const link = (raw && typeof raw === "object" ? raw : {}) as { text?: unknown; url?: unknown }
      const text = typeof link.text === "string" ? link.text : ""
      const url = typeof link.url === "string" ? link.url : ""
      if (!text.trim() && !url.trim()) {
        delete customFields[fieldKey]
        if (required && enforceRequired) errors[fieldKey] = "leadSheetFieldRequired"
        continue
      }
      const built = buildImageLinkValue(text, url)
      if (built.ok) customFields[fieldKey] = built.value
      else errors[fieldKey] = imageLinkErrorMessageKey(built.error)
      continue
    }

    if (isEmptyCustomFieldValue(raw) || (fieldType === "number" && typeof raw === "number" && !Number.isFinite(raw))) {
      delete customFields[fieldKey]
      if (required && enforceRequired) errors[fieldKey] = "leadSheetFieldRequired"
    }
  }

  if (Object.keys(errors).length > 0 || !parsedDate) {
    if (!parsedDate && !errors.date) errors.date = "leadSheetDateInvalid"
    return { ok: false, errors }
  }

  return {
    ok: true,
    lead: {
      ...draft,
      fullName: draft.fullName.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      date: parsedDate.date,
      time: parsedDate.time,
      customFields,
    },
  }
}
