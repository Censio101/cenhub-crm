import { isValidFieldKey } from "@/lib/lead-sheet/field-key"
import { STANDARD_WEBHOOK_FIELDS } from "@/lib/lead-sheet/webhook-spec"
import { CUSTOM_FIELD_TARGET_PREFIX, type FieldMapping } from "@/lib/leads/inbound-payload"
import { splitSourcePath } from "@/lib/leads/source-path"

/** Standard fields a funnel mapping may fill (`fullName`, `email`, ...). */
export const STANDARD_MAPPING_TARGETS: readonly string[] = STANDARD_WEBHOOK_FIELDS.map((f) => f.key)

const MAX_ENTRIES = 80
const MAX_PATH_LENGTH = 200

/**
 * True for `a`, `a.b`, `Your Name`, `a.b.0.c`: dot-separated keys with no empty segment. Spaces
 * inside a key are fine (form builders use names like "First Name"); a dot inside a key is
 * written `\.`.
 */
export function isValidSourcePath(path: string): boolean {
  if (!path || path.length > MAX_PATH_LENGTH) return false
  if (/[\u0000-\u001f]/.test(path)) return false
  return splitSourcePath(path).every((segment) => segment.trim().length > 0)
}

export function isValidMappingTarget(target: string): boolean {
  if (STANDARD_MAPPING_TARGETS.includes(target)) return true
  if (!target.startsWith(CUSTOM_FIELD_TARGET_PREFIX)) return false
  return isValidFieldKey(target.slice(CUSTOM_FIELD_TARGET_PREFIX.length))
}

export type MappingValidation = { ok: true; mapping: FieldMapping } | { ok: false; error: string }

/**
 * Validates a funnel field mapping (`target -> path in the sender's JSON`) and drops empty
 * entries. Targets that point at a removed custom column are still accepted so an existing
 * mapping can be saved; the editor flags them for removal.
 */
export function validateFunnelFieldMapping(input: unknown): MappingValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Field mapping must be an object" }
  }

  const entries = Object.entries(input as Record<string, unknown>)
  if (entries.length > MAX_ENTRIES) {
    return { ok: false, error: "Too many mapping entries" }
  }

  const mapping: FieldMapping = {}
  for (const [target, rawSource] of entries) {
    if (typeof rawSource !== "string") {
      return { ok: false, error: `The path for "${target}" must be text` }
    }
    const source = rawSource.trim()
    if (!source) continue

    if (!isValidMappingTarget(target)) {
      return { ok: false, error: `"${target}" is not a field this webhook can fill` }
    }
    if (!isValidSourcePath(source)) {
      return {
        ok: false,
        error: `"${source}" is not a valid path (use names separated by dots, for example answers.size)`,
      }
    }
    mapping[target] = source
  }
  return { ok: true, mapping }
}
