import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import {
  deleteLeadFunnel,
  generateWebhookSecret,
  getLeadFunnelById,
  updateLeadFunnel,
} from "@/lib/db/lead-funnels-repository"
import type { LeadFunnelPlatform } from "@/lib/db/types"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import type { FieldMapping } from "@/lib/leads/inbound-payload"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = {
  params: Promise<{ slug: string; funnelId: string }>
}

function serializeFunnel(row: NonNullable<Awaited<ReturnType<typeof getLeadFunnelById>>>) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    platform: row.platform,
    enabled: row.enabled,
    fieldMapping: row.field_mapping ?? {},
    webhookSecret: row.webhook_secret,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
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

    const funnel = await updateLeadFunnel(admin, funnelId, organization.id, {
      name: body.name,
      slug: body.slug,
      platform: body.platform,
      fieldMapping: body.fieldMapping,
      enabled: body.enabled,
      webhookSecret: body.regenerateSecret ? generateWebhookSecret() : undefined,
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
