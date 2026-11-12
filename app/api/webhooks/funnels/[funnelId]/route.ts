import { NextResponse } from "next/server"

import { createLead, findLeadIdByLegacyId } from "@/lib/db/leads-repository"
import { clampFormSteps, parseFormStepsTotal } from "@/lib/lead-sheet/form-steps"
import { mergeFunnelStepIntoExistingLead } from "@/lib/leads/funnel-webhook-step-merge"
import { getOrganizationById } from "@/lib/db/organizations-repository"
import {
  captureFunnelSample,
  getLeadFunnelById,
  isFunnelListening,
  recordFunnelSampleError,
} from "@/lib/db/lead-funnels-repository"
import { resolveLeadSheetForOrganization } from "@/lib/db/lead-sheet-repository"
import { buildWebhookLeadSheetInfo } from "@/lib/lead-sheet/webhook-spec"
import { customFieldDefsForFunnel } from "@/lib/lead-sheet/webhook-fields"
import type { FieldMapping } from "@/lib/leads/inbound-payload"
import { getOrganizationServiceAliasMap } from "@/lib/db/service-aliases-repository"
import { resolveOrganizationServices } from "@/lib/db/services-repository"
import {
  logLeadNotifySkippedFromWebhook,
  logLeadNotifySteppedFormDisabled,
  notifyNewLeadFromFunnelWebhook,
} from "@/lib/leads/notify-new-lead"
import { runAfterResponse } from "@/lib/meta/capi-outbox"
import {
  mergeFunnelWebhookIntoExistingMetaLead,
  metaLeadgenLegacyId,
} from "@/lib/leads/funnel-webhook-meta-merge"
import { applyFunnelDefaultSegment } from "@/lib/leads/funnel-default-segment"
import { funnelSheetSourceLabel } from "@/lib/funnels/funnel-sheet-source-label"
import { serviceIdsEditorFromSheet } from "@/lib/lead-sheet/service-ids-editor"
import { buildInboundLead, parseInbound } from "@/lib/leads/process-inbound"
import { readWebhookBody } from "@/lib/leads/read-webhook-body"
import { timingSafeEqualString } from "@/lib/security/timing-safe-equal"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ funnelId: string }> }

/** A captured sample is stored as is, so it stays small. */
const MAX_SAMPLE_JSON_LENGTH = 50_000

function readBearerSecret(request: Request): string | null {
  const header = request.headers.get("authorization")
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim()
  }
  return null
}

export async function POST(request: Request, context: RouteContext) {
  const { funnelId } = await context.params
  const admin = createAdminClient()

  const funnelRow = await getLeadFunnelById(admin, funnelId)
  if (!funnelRow || !funnelRow.enabled) {
    return NextResponse.json({ error: "Funnel not found" }, { status: 404 })
  }
  const funnel = funnelRow

  const token = readBearerSecret(request) ?? ""

  if (!token || !timingSafeEqualString(token, funnel.webhook_secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const organizationId = funnel.organization_id
  const listening = isFunnelListening(funnel)

  const read = await readWebhookBody(request)
  if (!read.ok) {
    // While waiting for a sample, tell the admin why this request could not be used.
    if (listening) await recordFunnelSampleError(admin, funnelId, read.error)
    return NextResponse.json({ error: read.error }, { status: read.status })
  }
  const body = read.body

  if (listening) {
    if (JSON.stringify(body).length > MAX_SAMPLE_JSON_LENGTH) {
      const error = "The request is too large to use as a sample"
      await recordFunnelSampleError(admin, funnelId, error)
      return NextResponse.json({ error }, { status: 413 })
    }
    // The one request that arrives while listening becomes the sample and is not saved as a
    // lead. If another request won the race, this one continues as a normal lead below.
    if (await captureFunnelSample(admin, funnelId, body)) {
      return NextResponse.json({ ok: true, sample: true }, { status: 200 })
    }
  }

  // The saved mapping only applies while the webhook is set to the funnel page's own names.
  const mapping = funnel.data_format === "own" ? ((funnel.field_mapping ?? {}) as FieldMapping) : {}
  const parsed = parseInbound(body, mapping)

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 422 })
  }

  // With an externalId, retries and double submits resolve to the same lead instead of
  // creating duplicates. The id is scoped to this funnel.
  const externalId = parsed.canonical.externalId
  const legacyId = externalId ? `hook:${funnelId}:${externalId.slice(0, 200)}` : null

  function duplicateResponse(leadId: string) {
    return NextResponse.json({ ok: true, leadId, duplicate: true }, { status: 200 })
  }

  try {
    const existingId = legacyId
      ? await findLeadIdByLegacyId(admin, funnel.organization_id, legacyId)
      : null

    // Custom columns come from the client's *current* lead sheet, so the accepted
    // payload changes automatically when the template is switched.
    const [leadSheet, services, serviceAliasMap] = await Promise.all([
      resolveLeadSheetForOrganization(admin, funnel.organization_id),
      resolveOrganizationServices(admin, funnel.organization_id),
      getOrganizationServiceAliasMap(admin, funnel.organization_id),
    ])
    // Partial steps: the sheet sets how many steps the funnel form has.
    const formStepsTotal = parseFormStepsTotal(leadSheet?.template.formStepsTotal)
    const stepsCompleted = parsed.canonical.stepsCompleted

    const sheetInfo = leadSheet ? buildWebhookLeadSheetInfo(leadSheet) : null
    const built = buildInboundLead({
      parsed,
      customFieldDefs:
        leadSheet && sheetInfo
          ? customFieldDefsForFunnel(leadSheet, sheetInfo, funnel.webhook_field_targets)
          : [],
      services,
      serviceAliasMap,
      platform: funnel.platform,
      serviceIdsEditor: serviceIdsEditorFromSheet(leadSheet),
    })
    let { lead, warnings } = built
    lead = applyFunnelDefaultSegment(lead, funnel)

    // The same lead arrived again. A stepped form's later steps are merged into it; anything
    // else is a retry or double submit and changes nothing.
    async function respondToExisting(leadId: string) {
      if (formStepsTotal && stepsCompleted !== undefined) {
        const updated = await mergeFunnelStepIntoExistingLead(
          admin,
          organizationId,
          leadId,
          lead,
          built.customFields,
          stepsCompleted,
          formStepsTotal
        )
        runAfterResponse(() =>
          logLeadNotifySkippedFromWebhook(admin, {
            organizationId,
            funnelId: funnel.id,
            funnelName: funnel.name,
            leadId,
            leadName: lead.fullName,
            skipReason: "step_merge",
          })
        )
        return NextResponse.json({ ok: true, leadId, updated }, { status: 200 })
      }
      runAfterResponse(() =>
        logLeadNotifySkippedFromWebhook(admin, {
          organizationId,
          funnelId: funnel.id,
          funnelName: funnel.name,
          leadId,
          leadName: lead.fullName,
          skipReason: "duplicate_lead",
        })
      )
      return duplicateResponse(leadId)
    }

    if (existingId) return await respondToExisting(existingId)

    // Only a sender that reports its step is a stepped form; any other lead counts as complete.
    if (formStepsTotal && stepsCompleted !== undefined) {
      lead.formStepsDone = clampFormSteps(stepsCompleted, formStepsTotal)
    }

    const metaLegacyId =
      metaLeadgenLegacyId(parsed.canonical.externalId) ??
      metaLeadgenLegacyId(parsed.canonical.metaAdId)
    if (metaLegacyId) {
      const existingMetaLeadId = await findLeadIdByLegacyId(
        admin,
        funnel.organization_id,
        metaLegacyId
      )
      if (existingMetaLeadId) {
        await mergeFunnelWebhookIntoExistingMetaLead(
          admin,
          funnel.organization_id,
          existingMetaLeadId,
          lead,
          built.customFields
        )
        runAfterResponse(() =>
          logLeadNotifySkippedFromWebhook(admin, {
            organizationId,
            funnelId: funnel.id,
            funnelName: funnel.name,
            leadId: existingMetaLeadId,
            leadName: lead.fullName,
            skipReason: "duplicate_lead",
          })
        )
        return duplicateResponse(existingMetaLeadId)
      }
    }

    let created
    try {
      created = await createLead(admin, funnel.organization_id, lead, {
        legacyId: legacyId ?? metaLegacyId,
        leadFunnelId: funnel.id,
        funnelSourceLabel: funnelSheetSourceLabel(funnel),
        audit: { source: "webhook" },
      })
    } catch (insertError) {
      // Two identical requests can race past the check above; the unique index decides.
      if (legacyId && (insertError as { code?: string } | null)?.code === "23505") {
        const racedId = await findLeadIdByLegacyId(admin, funnel.organization_id, legacyId)
        if (racedId) return await respondToExisting(racedId)
      }
      throw insertError
    }

    const notifyContext = {
      organizationId: funnel.organization_id,
      funnelId: funnel.id,
      funnelName: funnel.name,
      lead: created,
    }

    runAfterResponse(async () => {
      if (formStepsTotal) {
        await logLeadNotifySteppedFormDisabled(admin, {
          ...notifyContext,
          primaryContactEmail: null,
        })
        return
      }
      const org = await getOrganizationById(admin, funnel.organization_id)
      if (!org) return
      await notifyNewLeadFromFunnelWebhook(admin, {
        ...notifyContext,
        primaryContactEmail: org.primary_contact_email ?? null,
      })
    })

    return NextResponse.json(
      { ok: true, leadId: created.id, ...(warnings.length > 0 ? { warnings } : {}) },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Insert failed"
    // Deliveries are not stored; failures go to the server log only.
    console.error("funnel webhook failed", funnelId, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
