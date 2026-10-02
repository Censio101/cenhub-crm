import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { getLeadFunnelById } from "@/lib/db/lead-funnels-repository"
import {
  listCustomFieldDefs,
  resolveLeadSheetForOrganization,
} from "@/lib/db/lead-sheet-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import type { FieldMapping } from "@/lib/leads/inbound-payload"
import { resolveOrganizationServices } from "@/lib/db/services-repository"
import { processInbound } from "@/lib/leads/process-inbound"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = {
  params: Promise<{ slug: string; funnelId: string }>
}

function cleanMapping(value: unknown): FieldMapping | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const out: FieldMapping = {}
  for (const [target, source] of Object.entries(value as Record<string, unknown>)) {
    if (typeof source === "string" && source.trim()) out[target] = source.trim()
  }
  return out
}

/**
 * Dry run: shows what a webhook body would become (mapped fields, custom columns, warnings)
 * without creating a lead. `fieldMapping` may carry the editor's unsaved draft.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug, funnelId } = await context.params
    const body = (await request.json().catch(() => null)) as {
      payload?: unknown
      fieldMapping?: unknown
    } | null

    let payload = body?.payload
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload)
      } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
      }
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json(
        { ok: false, error: "The sample must be a JSON object" },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const funnel = await getLeadFunnelById(admin, funnelId)
    if (!funnel || funnel.organization_id !== organization.id) {
      return NextResponse.json({ error: "Funnel not found" }, { status: 404 })
    }

    const result = await processInbound({
      body: payload as Record<string, unknown>,
      fieldMapping:
        cleanMapping(body?.fieldMapping) ??
        (funnel.data_format === "own" ? ((funnel.field_mapping ?? {}) as FieldMapping) : {}),
      platform: funnel.platform,
      loadCustomFieldDefs: async () => {
        const sheet = await resolveLeadSheetForOrganization(admin, organization.id)
        return sheet ? listCustomFieldDefs(sheet) : []
      },
      loadServices: () => resolveOrganizationServices(admin, organization.id),
    })

    if (!result.ok) {
      // Same reason the real webhook would answer 422.
      return NextResponse.json({ ok: false, error: result.error })
    }

    const { lead } = result
    return NextResponse.json({
      ok: true,
      externalId: result.externalId,
      lead: {
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        date: lead.date,
        time: lead.time ?? null,
        segment: lead.segment,
        serviceIds: lead.serviceIds,
        platform: lead.platform,
        companyName: lead.companyName,
        address: lead.address,
        zipCode: lead.zipCode,
        city: lead.city,
        metaAdId: lead.metaAdId,
      },
      customFields: result.customFields,
      warnings: result.warnings,
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
