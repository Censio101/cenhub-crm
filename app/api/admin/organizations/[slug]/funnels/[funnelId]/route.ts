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

    const funnel = await updateLeadFunnel(admin, funnelId, organization.id, {
      name: body.name,
      slug: body.slug,
      platform: body.platform,
      fieldMapping,
      enabled: body.enabled,
      webhookSecret: body.regenerateSecret ? generateWebhookSecret() : undefined,
      dataFormat: body.dataFormat,
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
