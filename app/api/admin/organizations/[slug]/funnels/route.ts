import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import {
  createLeadFunnel,
  listLeadFunnelsForOrganization,
} from "@/lib/db/lead-funnels-repository"
import type { LeadFunnelPlatform } from "@/lib/db/types"
import { getOrganizationWithStatsBySlug } from "@/lib/db/organizations-repository"
import type { FieldMapping } from "@/lib/leads/inbound-payload"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

function serializeFunnel(row: Awaited<ReturnType<typeof listLeadFunnelsForOrganization>>[number]) {
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationWithStatsBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const funnels = await listLeadFunnelsForOrganization(admin, organization.id)
    return NextResponse.json({
      funnels: funnels.map(serializeFunnel),
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json()) as {
      name?: string
      slug?: string
      platform?: LeadFunnelPlatform
      fieldMapping?: FieldMapping
      enabled?: boolean
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const funnelSlug =
      body.slug?.trim() ||
      body.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") ||
      "source"

    const admin = createAdminClient()
    const organization = await getOrganizationWithStatsBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const funnel = await createLeadFunnel(admin, {
      organizationId: organization.id,
      name: body.name,
      slug: funnelSlug,
      platform: body.platform ?? "website",
      fieldMapping: body.fieldMapping,
      enabled: body.enabled,
    })

    return NextResponse.json({ funnel: serializeFunnel(funnel) }, { status: 201 })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
