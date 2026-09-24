import type { MessageKey } from "@/lib/i18n"
import type { FunnelId } from "@/lib/performance/funnels"

export const FUNNEL_MESSAGE_KEYS: Record<FunnelId, MessageKey> = {
  meta: "dashboardFunnelMeta",
  website: "dashboardFunnelWebsite",
  landing: "dashboardFunnelLanding",
}
