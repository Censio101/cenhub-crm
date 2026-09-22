export const FUNNELS = [
  { id: "meta", label: "Meta annonce funnel" },
  { id: "website", label: "Hjemmeside funnel" },
  { id: "landing", label: "Landing page funnel" },
] as const

/** Official Meta / Facebook brand blue for Meta ads spend. */
export const META_ADS_BLUE = "#1877F2"

export const META_ADS_SPEND_LABEL = "Meta ads spend"

export type FunnelId = (typeof FUNNELS)[number]["id"]

export function isFunnelId(value: string): value is FunnelId {
  return FUNNELS.some((funnel) => funnel.id === value)
}

export function getFunnelLabel(id: FunnelId | null | undefined): string {
  if (!id) return "Alle funnels"
  return FUNNELS.find((funnel) => funnel.id === id)?.label ?? "Alle funnels"
}

export function funnelVolumeShare(id: FunnelId, month: number): number {
  switch (id) {
    case "meta":
      return 0.5 + 0.05 * Math.sin((month - 1) * 0.6)
    case "website":
      return 0.28 + 0.04 * Math.cos(month * 0.45)
    case "landing":
      return 0.22 + 0.04 * Math.sin((month - 4) * 0.5)
  }
}

export function funnelAdSpendShare(id: FunnelId, month: number): number {
  switch (id) {
    case "meta":
      return 0.76 + 0.04 * Math.sin(month * 0.4)
    case "website":
      return 0.06 + 0.02 * Math.cos((month + 2) * 0.5)
    case "landing":
      return 0.18 + 0.03 * Math.sin((month - 3) * 0.55)
  }
}
