import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"

import {
  filterColumnsForFormSourceProfile,
  type FunnelFormViewConfig,
} from "@/lib/leads/funnel-sheet-column-profile"

export type { FunnelFormViewConfig } from "@/lib/leads/funnel-sheet-column-profile"

/** @deprecated Use filterColumnsForFormSourceProfile with funnelFormViews from API. */
export function filterColumnsForFormSourceFilter(
  columns: readonly LeadSheetTemplateColumn[],
  formSource: string | "all",
  configsByLabel?: ReadonlyMap<string, FunnelFormViewConfig> | null
): LeadSheetTemplateColumn[] {
  return filterColumnsForFormSourceProfile(columns, formSource, configsByLabel)
}
