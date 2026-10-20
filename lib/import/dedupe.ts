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
 * Marks duplicate contacts within the file. When two rows share email or phone, the row with a
 * mapped service value is kept (so a bare Meta row does not win over a Vinduespuds/Fliserens row).
 */
export function markFileDuplicates<T extends { values: Record<string, CellValue> }>(
  rows: readonly T[],
  mapping: ColumnMapping
): (T & { fileDuplicate: boolean })[] {
  const keyed = rows.map((row, index) => ({
    index,
    row,
    keys: contactKeys(
      readMapped(row.values, mapping, "email"),
      readMapped(row.values, mapping, "phone")
    ),
    hasService: Boolean(cellText(readMapped(row.values, mapping, "serviceIds"), 400).trim()),
  }))

  const keeperForKey = new Map<string, number>()
  for (const entry of keyed) {
    for (const key of entry.keys) {
      const prevIndex = keeperForKey.get(key)
      if (prevIndex === undefined) {
        keeperForKey.set(key, entry.index)
        continue
      }
      const prev = keyed[prevIndex]
      if (!prev.hasService && entry.hasService) {
        keeperForKey.set(key, entry.index)
      }
    }
  }

  return keyed.map((entry) => {
    if (entry.keys.length === 0) return { ...entry.row, fileDuplicate: false }
    const fileDuplicate = entry.keys.some((key) => keeperForKey.get(key) !== entry.index)
    return { ...entry.row, fileDuplicate }
  })
}
