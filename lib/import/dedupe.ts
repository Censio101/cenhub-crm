import { cellText, normalizeEmail } from "@/lib/import/parse-values"
import { readMapped } from "@/lib/import/read-mapped"
import type { CellValue, ColumnMapping } from "@/lib/import/types"

/** Phone numbers are compared by their last 8 digits, so "+45 12 34 56 78" matches "12345678". */
export const PHONE_KEY_DIGITS = 8
const MIN_PHONE_DIGITS = 6

export function phoneKey(value: CellValue | undefined): string | null {
  const digits = cellText(value, 40).replace(/\D/g, "")
  return digits.length >= MIN_PHONE_DIGITS ? digits.slice(-PHONE_KEY_DIGITS) : null
}

export function emailKey(value: CellValue | undefined): string | null {
  const email = normalizeEmail(value)
  return email.includes("@") ? email : null
}

/** Keys that identify a lead across files and the CRM: `e:<email>` and `p:<last 8 digits>`. */
export function contactKeys(email: CellValue | undefined, phone: CellValue | undefined): string[] {
  const keys: string[] = []
  const e = emailKey(email)
  const p = phoneKey(phone)
  if (e) keys.push(`e:${e}`)
  if (p) keys.push(`p:${p}`)
  return keys
}

/**
 * Marks rows whose email or phone already appeared earlier in the file, so the server can skip
 * them. The first row with a contact is kept.
 */
export function markFileDuplicates<T extends { values: Record<string, CellValue> }>(
  rows: readonly T[],
  mapping: ColumnMapping
): (T & { fileDuplicate: boolean })[] {
  const seen = new Set<string>()
  return rows.map((row) => {
    const keys = contactKeys(
      readMapped(row.values, mapping, "email"),
      readMapped(row.values, mapping, "phone")
    )
    const duplicate = keys.some((key) => seen.has(key))
    for (const key of keys) seen.add(key)
    return { ...row, fileDuplicate: duplicate }
  })
}
