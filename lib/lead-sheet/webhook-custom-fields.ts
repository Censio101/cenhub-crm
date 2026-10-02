import { buildImageLinkValue } from "@/lib/lead-sheet/image-link"
import { isEmptyCustomFieldValue, validateCustomFieldValue } from "@/lib/lead-sheet/validate"
import type { LeadSheetCustomFieldDef } from "@/lib/lead-sheet/types"
import { normalizeLeadDate } from "@/lib/leads/inbound-payload"

export type WebhookFieldWarning = {
  /** Custom field key (or `customFields` when the container itself is wrong). */
  field: string
  code: "unknown_field" | "invalid_value" | "missing_required" | "invalid_container"
  message: string
}

type Coerced = { ok: true; value: unknown } | { ok: false; message: string }

const NUMBER_PATTERN = /^-?\d+([.,]\d+)?$/
const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/

function coerceValue(def: LeadSheetCustomFieldDef, raw: unknown): Coerced {
  switch (def.fieldType) {
    case "text":
    case "textarea": {
      if (typeof raw === "string") return { ok: true, value: raw.trim() }
      if (typeof raw === "number" || typeof raw === "boolean") {
        return { ok: true, value: String(raw) }
      }
      return { ok: false, message: "Expected text" }
    }
    case "number": {
      if (typeof raw === "number") return { ok: true, value: raw }
      if (typeof raw === "string") {
        const compact = raw.trim().replace(/\s/g, "")
        if (NUMBER_PATTERN.test(compact)) {
          return { ok: true, value: Number(compact.replace(",", ".")) }
        }
      }
      return { ok: false, message: "Expected a number" }
    }
    case "date": {
      const day = typeof raw === "string" ? normalizeLeadDate(raw) : null
      return day ? { ok: true, value: day } : { ok: false, message: "Expected a date (YYYY-MM-DD)" }
    }
    case "time": {
      const match = typeof raw === "string" ? TIME_PATTERN.exec(raw.trim()) : null
      if (match) {
        const hours = Number(match[1])
        const minutes = Number(match[2])
        if (hours <= 23 && minutes <= 59) {
          return {
            ok: true,
            value: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
          }
        }
      }
      return { ok: false, message: "Expected a time (HH:MM)" }
    }
    case "select": {
      const options = def.config.options ?? []
      const wanted = typeof raw === "string" ? raw.trim().toLocaleLowerCase() : null
      const match = wanted ? options.find((o) => o.toLocaleLowerCase() === wanted) : undefined
      return match !== undefined
        ? { ok: true, value: match }
        : { ok: false, message: `Expected one of: ${options.join(", ") || "(no options defined)"}` }
    }
    case "image": {
      // Either { text, url } or a plain URL string (the link text stays empty).
      const link =
        typeof raw === "string"
          ? { text: "", url: raw }
          : raw && typeof raw === "object"
            ? (raw as { text?: unknown; url?: unknown })
            : null
      if (!link || typeof link.url !== "string") {
        return { ok: false, message: "Expected a URL or { text, url }" }
      }
      const text = typeof link.text === "string" ? link.text : ""
      const built = buildImageLinkValue(text, link.url)
      return built.ok
        ? { ok: true, value: built.value }
        : { ok: false, message: "Invalid image link (use an http or https URL)" }
    }
    default:
      return { ok: false, message: "Unsupported field type" }
  }
}

/**
 * Turns the webhook's `customFields` object into values that match the client's lead
 * sheet. Senders are forgiving (numbers as strings, dates in other formats), so values are
 * coerced first and then validated. Invalid or unknown fields never fail the request — they
 * are skipped and reported as warnings so the lead itself is not lost.
 */
export function coerceWebhookCustomFields(
  raw: unknown,
  defs: LeadSheetCustomFieldDef[]
): { values: Record<string, unknown>; warnings: WebhookFieldWarning[] } {
  const values: Record<string, unknown> = {}
  const warnings: WebhookFieldWarning[] = []

  if (raw !== undefined && raw !== null && (typeof raw !== "object" || Array.isArray(raw))) {
    warnings.push({
      field: "customFields",
      code: "invalid_container",
      message: "customFields must be a JSON object",
    })
  }

  const input =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const defByKey = new Map(defs.map((d) => [d.fieldKey, d]))

  for (const [key, value] of Object.entries(input)) {
    const def = defByKey.get(key)
    if (!def) {
      warnings.push({
        field: key,
        code: "unknown_field",
        message: "Not a column in this client's lead sheet",
      })
      continue
    }
    if (isEmptyCustomFieldValue(value)) continue

    const coerced = coerceValue(def, value)
    const error = coerced.ok ? validateCustomFieldValue(def, coerced.value) : coerced.message
    if (!coerced.ok || error) {
      warnings.push({
        field: key,
        code: "invalid_value",
        message: coerced.ok ? (error as string) : coerced.message,
      })
      continue
    }
    values[key] = coerced.value
  }

  for (const def of defs) {
    if (def.required && values[def.fieldKey] === undefined) {
      warnings.push({
        field: def.fieldKey,
        code: "missing_required",
        message: "Required by the lead sheet but not provided",
      })
    }
  }

  return { values, warnings }
}
