import { NextResponse } from "next/server"

import { createLead } from "@/lib/db/leads-repository"
import {
  getLeadFunnelById,
  logLeadInboundEvent,
} from "@/lib/db/lead-funnels-repository"
import type { LeadSource } from "@/lib/db/types"
import {
  applyFieldMapping,
  canonicalToLead,
  parseCanonicalInbound,
  type FieldMapping,
} from "@/lib/leads/inbound-payload"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ funnelId: string }> }

function readBearerSecret(request: Request): string | null {
  const header = request.headers.get("authorization")
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim()
  }
  return null
}

function funnelSource(platform: string): LeadSource {
  if (platform === "landing") return "landing"
  if (platform === "manual") return "manual"
  return "website"
}

export async function POST(request: Request, context: RouteContext) {
  const { funnelId } = await context.params
  const admin = createAdminClient()

  const funnel = await getLeadFunnelById(admin, funnelId)
  if (!funnel || !funnel.enabled) {
    return NextResponse.json({ error: "Funnel not found" }, { status: 404 })
  }

  const url = new URL(request.url)
  const token =
    readBearerSecret(request) ?? url.searchParams.get("token")?.trim() ?? ""

  if (!token || token !== funnel.webhook_secret) {
    await logLeadInboundEvent(admin, {
      funnelId,
      organizationId: funnel.organization_id,
      statusCode: 401,
      errorMessage: "Invalid token",
    })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    await logLeadInboundEvent(admin, {
      funnelId,
      organizationId: funnel.organization_id,
      statusCode: 400,
      errorMessage: "Invalid JSON",
    })
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const mapped = applyFieldMapping(
    body,
    (funnel.field_mapping ?? {}) as FieldMapping
  )
  const parsed = parseCanonicalInbound(mapped)

  if (!parsed.ok) {
    await logLeadInboundEvent(admin, {
      funnelId,
      organizationId: funnel.organization_id,
      statusCode: 422,
      errorMessage: parsed.error,
      payload: body,
    })
    return NextResponse.json({ error: parsed.error }, { status: 422 })
  }

  try {
    const lead = canonicalToLead(parsed.lead, {
      platform: funnel.platform,
      source: funnelSource(funnel.platform),
    })
    const created = await createLead(admin, funnel.organization_id, lead)
    await logLeadInboundEvent(admin, {
      funnelId,
      organizationId: funnel.organization_id,
      statusCode: 201,
      payload: { leadId: created.id },
    })
    return NextResponse.json({ ok: true, leadId: created.id }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Insert failed"
    await logLeadInboundEvent(admin, {
      funnelId,
      organizationId: funnel.organization_id,
      statusCode: 500,
      errorMessage: message,
      payload: body,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
