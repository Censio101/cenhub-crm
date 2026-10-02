import { NextResponse } from "next/server"

import { createLead, findLeadIdByLegacyId } from "@/lib/db/leads-repository"
import {
  captureFunnelSample,
  getLeadFunnelById,
  isFunnelListening,
  recordFunnelSampleError,
} from "@/lib/db/lead-funnels-repository"
import {
  listCustomFieldDefs,
  resolveLeadSheetForOrganization,
} from "@/lib/db/lead-sheet-repository"
import type { FieldMapping } from "@/lib/leads/inbound-payload"
import { resolveOrganizationServices } from "@/lib/db/services-repository"
import { buildInboundLead, parseInbound } from "@/lib/leads/process-inbound"
import { readWebhookBody } from "@/lib/leads/read-webhook-body"
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

  const funnel = await getLeadFunnelById(admin, funnelId)
  if (!funnel || !funnel.enabled) {
    return NextResponse.json({ error: "Funnel not found" }, { status: 404 })
  }

  const url = new URL(request.url)
  const token = readBearerSecret(request) ?? url.searchParams.get("token")?.trim() ?? ""

  if (!token || token !== funnel.webhook_secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
    if (legacyId) {
      const existingId = await findLeadIdByLegacyId(admin, funnel.organization_id, legacyId)
      if (existingId) return duplicateResponse(existingId)
    }

    // Custom columns come from the client's *current* lead sheet, so the accepted
    // payload changes automatically when the template is switched.
    const [leadSheet, services] = await Promise.all([
      resolveLeadSheetForOrganization(admin, funnel.organization_id),
      resolveOrganizationServices(admin, funnel.organization_id),
    ])
    const { lead, warnings } = buildInboundLead({
      parsed,
      customFieldDefs: leadSheet ? listCustomFieldDefs(leadSheet) : [],
      services,
      platform: funnel.platform,
    })

    let created
    try {
      created = await createLead(admin, funnel.organization_id, lead, { legacyId })
    } catch (insertError) {
      // Two identical requests can race past the check above; the unique index decides.
      if (legacyId && (insertError as { code?: string } | null)?.code === "23505") {
        const existingId = await findLeadIdByLegacyId(admin, funnel.organization_id, legacyId)
        if (existingId) return duplicateResponse(existingId)
      }
      throw insertError
    }
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
