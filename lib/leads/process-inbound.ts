import type { LeadSource } from "@/lib/db/types"
import type { LeadSheetCustomFieldDef } from "@/lib/lead-sheet/types"
import type { ServiceIdsEditor } from "@/lib/lead-sheet/types"
import { resolveLeadServicesFields } from "@/lib/lead-sheet/service-ids-editor"
import {
  coerceWebhookCustomFields,
  type WebhookFieldWarning,
} from "@/lib/lead-sheet/webhook-custom-fields"
import {
  applyFieldMapping,
  canonicalToLead,
  parseCanonicalInbound,
  type CanonicalInboundLead,
  type FieldMapping,
} from "@/lib/leads/inbound-payload"
import type { Lead } from "@/lib/leads"
import type { ClientService } from "@/lib/services/types"

/**
 * The inbound webhook pipeline as pure functions, shared by the real webhook route and the
 * admin "test with sample JSON" route so both always behave the same:
 *   raw JSON -> field mapping -> standard fields -> custom columns (coerced) -> lead + warnings
 */

export function funnelLeadSource(platform: string): LeadSource {
  if (platform === "landing") return "landing"
  if (platform === "manual") return "manual"
  return "website"
}

export type ParsedInbound =
  | { ok: false; error: string }
  | {
      ok: true
      /** Body after the funnel's field mapping was applied. */
      mapped: Record<string, unknown>
      canonical: CanonicalInboundLead
      warnings: WebhookFieldWarning[]
    }

/** Applies the funnel's field mapping and reads the standard lead fields. */
export function parseInbound(
  body: Record<string, unknown>,
  fieldMapping: FieldMapping
): ParsedInbound {
  const mapped = applyFieldMapping(body, fieldMapping)
  const parsed = parseCanonicalInbound(mapped)
  if (!parsed.ok) return { ok: false, error: parsed.error }

  return {
    ok: true,
    mapped,
    canonical: parsed.lead,
    warnings: parsed.warnings.map((w) => ({ ...w, code: "invalid_value" as const })),
  }
}

export type BuiltInbound = {
  lead: Lead
  customFields: Record<string, unknown>
  warnings: WebhookFieldWarning[]
}

/** Builds the lead to store, coercing `customFields` against the client's current sheet. */
export function buildInboundLead(input: {
  parsed: Extract<ParsedInbound, { ok: true }>
  customFieldDefs: LeadSheetCustomFieldDef[]
  /** The client's services; incoming values are matched against these (slug or name). */
  services: readonly ClientService[]
  serviceAliasMap?: ReadonlyMap<string, string>
  platform: string
  serviceIdsEditor?: ServiceIdsEditor
}): BuiltInbound {
  const { parsed } = input
  const editor = input.serviceIdsEditor ?? "picker"
  const rawServices = parsed.canonical.serviceIds ?? []
  const resolved = resolveLeadServicesFields({
    rawValues: rawServices,
    editor,
    services: input.services,
    serviceAliasMap: input.serviceAliasMap,
  })

  const serviceWarnings: WebhookFieldWarning[] =
    editor === "picker" && resolved.unknown.length > 0
      ? [
          {
            field: "serviceIds",
            code: "invalid_value",
            message: `Unknown service: ${resolved.unknown.join(", ")}`,
          },
        ]
      : []

  const custom = coerceWebhookCustomFields(parsed.mapped.customFields, input.customFieldDefs)

  const lead = canonicalToLead(parsed.canonical, {
    platform: input.platform,
    source: funnelLeadSource(input.platform),
    serviceIds: resolved.serviceIds,
  })

  return {
    lead: {
      ...lead,
      serviceLabels: resolved.serviceLabels,
      customFields: custom.values,
    },
    customFields: custom.values,
    warnings: [...parsed.warnings, ...serviceWarnings, ...custom.warnings],
  }
}

export type ProcessedInbound =
  { ok: false; error: string } | ({ ok: true; externalId: string | null } & BuiltInbound)

/** Whole pipeline in one call. `loadCustomFieldDefs` runs only once the standard fields parse. */
export async function processInbound(input: {
  body: Record<string, unknown>
  fieldMapping: FieldMapping
  platform: string
  loadCustomFieldDefs: () => Promise<LeadSheetCustomFieldDef[]>
  loadServices: () => Promise<ClientService[]>
  loadServiceAliasMap?: () => Promise<ReadonlyMap<string, string>>
  serviceIdsEditor?: ServiceIdsEditor
}): Promise<ProcessedInbound> {
  const parsed = parseInbound(input.body, input.fieldMapping)
  if (!parsed.ok) return parsed

  const [customFieldDefs, services, serviceAliasMap] = await Promise.all([
    input.loadCustomFieldDefs(),
    input.loadServices(),
    input.loadServiceAliasMap?.() ?? Promise.resolve(undefined),
  ])
  const built = buildInboundLead({
    parsed,
    customFieldDefs,
    services,
    serviceAliasMap,
    platform: input.platform,
    serviceIdsEditor: input.serviceIdsEditor,
  })
  return { ok: true, externalId: parsed.canonical.externalId ?? null, ...built }
}
