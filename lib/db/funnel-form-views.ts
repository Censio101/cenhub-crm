import type { LeadFunnelRow } from "@/lib/db/types"
import { funnelSheetSourceLabel } from "@/lib/funnels/funnel-sheet-source-label"
import type { FunnelFormViewConfig } from "@/lib/leads/funnel-sheet-column-profile"

/** Client dashboard: how to narrow columns when Leadformular matches this funnel. */
export function serializeFunnelFormViews(funnels: readonly LeadFunnelRow[]): FunnelFormViewConfig[] {
  return funnels
    .filter((f) => f.enabled)
    .map((f) => ({
      label: funnelSheetSourceLabel(f),
      webhookFieldTargets: f.webhook_field_targets ?? null,
    }))
}
