import type { LeadPatch } from "@/lib/db/lead-mapper"
import {
  normalizeServiceRawInput,
  serviceIdsEditorFromSheet,
} from "@/lib/lead-sheet/service-ids-editor"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import type { ClientService } from "@/lib/services/types"

/** Normalizes service fields on a client lead patch using the org sheet editor mode. */
export function applyLeadServicePatch(
  patch: LeadPatch,
  leadSheet: ResolvedLeadSheetConfig | null,
  _services: readonly ClientService[],
  _serviceAliasMap?: ReadonlyMap<string, string>
): LeadPatch {
  const editor = serviceIdsEditorFromSheet(leadSheet)
  const next = { ...patch }

  if (patch.serviceLabels !== undefined && editor === "text") {
    next.serviceLabels = normalizeServiceRawInput(patch.serviceLabels)
    next.serviceIds = []
    next.service = ""
    return next
  }

  if (patch.serviceIds !== undefined && editor === "picker") {
    next.serviceLabels = []
    next.service = (patch.serviceIds[0] ?? "") as LeadPatch["service"]
  }

  return next
}
