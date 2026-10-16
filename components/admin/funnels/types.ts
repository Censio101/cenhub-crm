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
  webhookSecret: string
  hasSample: boolean
  sampleReceivedAt: string | null
  /** Seconds left of the listening window, or null when not listening. */
  listeningSeconds: number | null
}
