import type { OfferEngagement } from "@/lib/onboarding/types"

export type OfferEngagementSummary = {
  sessions: number
  opened: number
  maxScrollPct: number
  totalReadSec: number
}

export function summarizeOfferEngagement(
  sessions: OfferEngagement[],
  offerId: string
): OfferEngagementSummary {
  const mine = sessions.filter((item) => item.offerId === offerId)
  return {
    sessions: mine.length,
    opened: mine.filter((item) => item.opened).length,
    maxScrollPct: mine.reduce((max, item) => Math.max(max, item.maxScrollPct), 0),
    totalReadSec: mine.reduce((sum, item) => sum + item.durationSec, 0),
  }
}
