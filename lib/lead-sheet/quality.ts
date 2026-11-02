/**
 * Lead quality (Low / Medium / High) lives in a custom dropdown column called "quality" or
 * "kvalitet". These helpers colour it and sort it by how good the lead is.
 */
export type QualityTone = "high" | "medium" | "low"

const QUALITY_FIELD_KEYS = new Set(["quality", "kvalitet"])

export function isQualityFieldKey(fieldKey: string): boolean {
  return QUALITY_FIELD_KEYS.has(fieldKey)
}

export function qualityTone(value: string): QualityTone | null {
  const v = value.trim().toLowerCase()
  if (v === "høj" || v === "hoj" || v === "high") return "high"
  if (v === "mellem" || v === "medium") return "medium"
  if (v === "lav" || v === "low") return "low"
  return null
}

/** 1 = best. Ascending order therefore lists the best leads first. Unrated leads have no rank. */
export function qualityRank(value: unknown): number {
  const tone = typeof value === "string" ? qualityTone(value) : null
  if (tone === "high") return 1
  if (tone === "medium") return 2
  if (tone === "low") return 3
  return Number.NaN
}
