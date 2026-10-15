import { readMapped } from "@/lib/import/read-mapped"
import { cellText } from "@/lib/import/parse-values"
import { splitServiceText } from "@/lib/services/match"
import type { ColumnMapping, ImportRowInput } from "@/lib/import/types"
import { foldServiceMatchKey } from "@/lib/services/fold-match-key"
import { matchServices, type Matchable } from "@/lib/services/match"

const MAX_DISTINCT = 200

/** Distinct raw service tokens from mapped columns (for import value mapping UI). */
export function scanDistinctImportServiceValues(
  rows: readonly ImportRowInput[],
  mapping: ColumnMapping
): string[] {
  if (!mapping.serviceIds?.length) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const row of rows) {
    const raw = readMapped(row.values, mapping, "serviceIds")
    const text = cellText(raw, 400)
    if (!text) continue
    for (const part of splitServiceText(text)) {
      const key = part.trim()
      if (!key) continue
      const norm = foldServiceMatchKey(key)
      if (seen.has(norm)) continue
      seen.add(norm)
      out.push(key)
      if (out.length >= MAX_DISTINCT) return out
    }
  }
  return out.sort((a, b) => a.localeCompare(b, "da"))
}

export function resolveImportServicePreview(
  value: string,
  services: readonly Matchable[],
  serviceAliasMap?: ReadonlyMap<string, string>
): { slug: string | null; unknown: boolean } {
  const matched = matchServices([value], services, serviceAliasMap)
  if (matched.ids.length > 0) return { slug: matched.ids[0] ?? null, unknown: false }
  return { slug: null, unknown: value.trim().length > 0 }
}
