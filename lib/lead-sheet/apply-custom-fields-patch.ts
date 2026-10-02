import type { LeadPatch } from "@/lib/db/lead-mapper"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import { listCustomFieldDefs } from "@/lib/db/lead-sheet-repository"
import { sanitizeCustomFieldsPatch } from "@/lib/lead-sheet/validate"

/** Merges accepted values into the stored object and drops keys the client cleared. */
export function mergeCustomFields(
  existing: Record<string, unknown>,
  values: Record<string, unknown>,
  cleared: string[]
): Record<string, unknown> {
  const merged = { ...existing, ...values }
  for (const key of cleared) delete merged[key]
  return merged
}

export function applyCustomFieldsToPatch(
  patch: LeadPatch,
  existing: Record<string, unknown>,
  leadSheet: ResolvedLeadSheetConfig | null
): { patch: LeadPatch; error: string | null } {
  if (patch.customFields === undefined) {
    return { patch, error: null }
  }

  const defs = leadSheet ? listCustomFieldDefs(leadSheet) : []
  const { values, cleared, error } = sanitizeCustomFieldsPatch(patch.customFields, defs)
  if (error) return { patch, error }

  return {
    patch: {
      ...patch,
      customFields: mergeCustomFields(existing, values, cleared),
    },
    error: null,
  }
}

/**
 * New leads: every custom value is validated against the sheet and canonicalized, and
 * required columns must be filled. Values for keys that are not on the sheet are dropped.
 */
export function sanitizeNewLeadCustomFields(
  customFields: Record<string, unknown> | undefined,
  leadSheet: ResolvedLeadSheetConfig | null
): { customFields: Record<string, unknown>; error: string | null } {
  const defs = leadSheet ? listCustomFieldDefs(leadSheet) : []
  if (defs.length === 0) return { customFields: customFields ?? {}, error: null }

  const { values, error } = sanitizeCustomFieldsPatch(customFields ?? {}, defs)
  if (error) return { customFields: {}, error }

  const missing = defs.find((def) => def.required && values[def.fieldKey] === undefined)
  if (missing) return { customFields: {}, error: `${missing.label} is required` }

  return { customFields: values, error: null }
}
