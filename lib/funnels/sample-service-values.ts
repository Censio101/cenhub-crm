import { getByPath } from "@/lib/leads/source-path"
import { foldServiceMatchKey } from "@/lib/services/fold-match-key"
import { splitServiceText } from "@/lib/services/match"

const MAX_DISTINCT = 200

function tokensFromValue(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) return value.flatMap(tokensFromValue)
  if (typeof value === "string") return splitServiceText(value)
  if (typeof value === "number" || typeof value === "boolean") return [String(value)]
  return []
}

/** Distinct service labels found at a mapped JSON path in a webhook sample. */
export function scanSampleServiceValues(
  sample: Record<string, unknown> | null,
  sourcePath: string | undefined
): string[] {
  const path = sourcePath?.trim()
  if (!sample || !path) return []
  const raw = getByPath(sample, path)
  const seen = new Set<string>()
  const out: string[] = []
  for (const token of tokensFromValue(raw)) {
    const key = token.trim()
    if (!key) continue
    const norm = foldServiceMatchKey(key)
    if (seen.has(norm)) continue
    seen.add(norm)
    out.push(key)
    if (out.length >= MAX_DISTINCT) break
  }
  return out.sort((a, b) => a.localeCompare(b, "da"))
}
