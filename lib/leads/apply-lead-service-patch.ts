import type { LeadPatch } from "@/lib/db/lead-mapper"
import {
  resolveLeadServicesFields,
  serviceIdsEditorFromSheet,
} from "@/lib/lead-sheet/service-ids-editor"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import type { ClientService } from "@/lib/services/types"

/** Normalizes service fields on a client lead patch using the org sheet editor mode. */
export function applyLeadServicePatch(
  patch: LeadPatch,
  leadSheet: ResolvedLeadSheetConfig | null,
  services: readonly ClientService[],
  serviceAliasMap?: ReadonlyMap<string, string>
): LeadPatch {
  const editor = serviceIdsEditorFromSheet(leadSheet)
  const next = { ...patch }

  if (patch.serviceLabels !== undefined) {
    const resolved = resolveLeadServicesFields({
      rawValues: patch.serviceLabels,
      editor: "text",
      services,
      serviceAliasMap,
    })
    next.serviceLabels = resolved.serviceLabels
    next.serviceIds = resolved.serviceIds
    next.service = (resolved.serviceIds[0] ?? "") as LeadPatch["service"]
    return next
  }

  if (patch.serviceIds !== undefined && editor === "picker") {
    next.serviceLabels = []
  }

  return next
}
