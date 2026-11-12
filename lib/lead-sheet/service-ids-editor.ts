import type { NamedService } from "@/lib/performance/services"
import type {
  LeadSheetTemplateColumn,
  ResolvedLeadSheetConfig,
  ServiceIdsEditor,
} from "@/lib/lead-sheet/types"
import { formatLeadServices, type Lead } from "@/lib/leads"
import { matchServices, splitServiceText } from "@/lib/services/match"
import type { ClientService } from "@/lib/services/types"

/** How the Services column is edited for this client's lead sheet (default picker). */
export function serviceIdsEditorFromSheet(
  config: ResolvedLeadSheetConfig | null | undefined
): ServiceIdsEditor {
  const col = config?.columns.find((c) => c.kind === "builtin" && c.builtinKey === "serviceIds")
  return serviceIdsEditorFromColumn(col)
}

export function serviceIdsEditorFromColumn(
  col: LeadSheetTemplateColumn | null | undefined
): ServiceIdsEditor {
  if (col?.kind === "builtin" && col.builtinKey === "serviceIds" && col.serviceIdsEditor === "text") {
    return "text"
  }
  return "picker"
}

function dedupeStrings(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

export function normalizeServiceRawInput(input: string | readonly string[]): string[] {
  const parts = typeof input === "string" ? splitServiceText(input) : [...input]
  return dedupeStrings(parts)
}

/** Resolves webhook/import/manual service text into stored lead fields. */
export function resolveLeadServicesFields(input: {
  rawValues: readonly string[]
  editor: ServiceIdsEditor
  services: readonly ClientService[]
  serviceAliasMap?: ReadonlyMap<string, string>
}): { serviceIds: string[]; serviceLabels: string[]; unknown: string[] } {
  const raw = dedupeStrings(input.rawValues)

  if (input.editor === "text") {
    return {
      serviceIds: [],
      serviceLabels: raw,
      unknown: [],
    }
  }

  const matched = matchServices(raw, input.services, input.serviceAliasMap)
  return {
    serviceIds: matched.ids,
    serviceLabels: [],
    unknown: matched.unknown,
  }
}

export function formatServicesForDisplay(
  lead: Pick<Lead, "serviceIds" | "service" | "serviceLabels">,
  enabledServices: readonly NamedService[],
  editor: ServiceIdsEditor
): string {
  if (editor === "text" && lead.serviceLabels && lead.serviceLabels.length > 0) {
    return lead.serviceLabels.join(", ")
  }
  return formatLeadServices(lead, enabledServices)
}
