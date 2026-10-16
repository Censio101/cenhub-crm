import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { serializeFunnel } from "@/lib/db/funnel-dto"
import {
  deleteLeadFunnel,
  generateWebhookSecret,
  getLeadFunnelById,
  updateLeadFunnel,
} from "@/lib/db/lead-funnels-repository"
import type { LeadFunnelPlatform } from "@/lib/db/types"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { resolveLeadSheetForOrganization } from "@/lib/db/lead-sheet-repository"
import { allEligibleWebhookTargets } from "@/lib/lead-sheet/webhook-fields"
import { buildWebhookLeadSheetInfo } from "@/lib/lead-sheet/webhook-spec"
import { validateFunnelFieldMapping } from "@/lib/leads/funnel-mapping"
import type { FieldMapping } from "@/lib/leads/inbound-payload"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = {
  params: Promise<{ slug: string; funnelId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug, funnelId } = await context.params
    const body = (await request.json()) as {
      name?: string
      slug?: string
      platform?: LeadFunnelPlatform
      fieldMapping?: FieldMapping
      enabled?: boolean
      regenerateSecret?: boolean
      dataFormat?: "ours" | "own"
      webhookFieldTargets?: string[] | null
    }

    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const existing = await getLeadFunnelById(admin, funnelId)
    if (!existing || existing.organization_id !== organization.id) {
      return NextResponse.json({ error: "Funnel not found" }, { status: 404 })
    }

    let fieldMapping: FieldMapping | undefined
    if (body.dataFormat !== undefined && body.dataFormat !== "ours" && body.dataFormat !== "own") {
      return NextResponse.json({ error: "Unknown data format" }, { status: 400 })
    }
    if (body.fieldMapping !== undefined) {
      const validation = validateFunnelFieldMapping(body.fieldMapping)
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
      fieldMapping = validation.mapping
    }

    let webhookFieldTargets: string[] | null | undefined
    if (body.webhookFieldTargets !== undefined) {
      if (body.webhookFieldTargets === null) {
        webhookFieldTargets = null
      } else if (!Array.isArray(body.webhookFieldTargets)) {
        return NextResponse.json({ error: "webhookFieldTargets must be an array" }, { status: 400 })
      } else {
        const sheet = buildWebhookLeadSheetInfo(
          await resolveLeadSheetForOrganization(admin, organization.id)
        )
        const eligible = sheet ? new Set(allEligibleWebhookTargets(sheet)) : new Set<string>()
        const cleaned = body.webhookFieldTargets.filter(
          (t): t is string => typeof t === "string" && eligible.has(t)
        )
        if (cleaned.length === 0) {
          return NextResponse.json({ error: "Select at least one webhook field" }, { status: 400 })
        }
        webhookFieldTargets =
          sheet && cleaned.length === allEligibleWebhookTargets(sheet).length ? null : cleaned
      }
    }

    const funnel = await updateLeadFunnel(admin, funnelId, organization.id, {
      name: body.name,
      slug: body.slug,
      platform: body.platform,
      fieldMapping,
      enabled: body.enabled,
      webhookSecret: body.regenerateSecret ? generateWebhookSecret() : undefined,
      dataFormat: body.dataFormat,
      webhookFieldTargets,
    })

    return NextResponse.json({ funnel: serializeFunnel(funnel) })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug, funnelId } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const existing = await getLeadFunnelById(admin, funnelId)
    if (!existing || existing.organization_id !== organization.id) {
      return NextResponse.json({ error: "Funnel not found" }, { status: 404 })
    }

    await deleteLeadFunnel(admin, funnelId, organization.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
