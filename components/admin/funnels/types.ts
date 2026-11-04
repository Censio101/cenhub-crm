export type FunnelFormat = "ours" | "own"

export type FunnelDto = {
  id: string
  name: string
  slug: string
  platform: "website" | "landing" | "manual"
  enabled: boolean
  /** `ours`: fixed Censio field names. `own`: mapping mode (saved paths apply). */
  dataFormat: "ours" | "own"
  fieldMapping: Record<string, string>
  /** Subset of sheet-eligible targets; null = all eligible from the lead sheet. */
  webhookFieldTargets: string[] | null
  defaultSegment: "b2b" | "b2c" | null
  /** Label on the lead sheet Formular filter; empty = funnel name. */
  sheetSourceLabel: string | null
  /** @deprecated Lead sheet uses webhookFieldTargets only; kept for DB/API compatibility. */
  sheetColumnProfile: "full" | "targets_and_pipeline" | null
  webhookSecret: string
  hasSample: boolean
  sampleReceivedAt: string | null
  /** Seconds left of the listening window, or null when not listening. */
  listeningSeconds: number | null
}
