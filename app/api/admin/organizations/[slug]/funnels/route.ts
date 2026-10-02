import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { createLeadFunnel, listLeadFunnelsForOrganization } from "@/lib/db/lead-funnels-repository"
import { serializeFunnel } from "@/lib/db/funnel-dto"
import { resolveLeadSheetForOrganization } from "@/lib/db/lead-sheet-repository"
import type { LeadFunnelPlatform } from "@/lib/db/types"
import { buildWebhookLeadSheetInfo } from "@/lib/lead-sheet/webhook-spec"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import type { FieldMapping } from "@/lib/leads/inbound-payload"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const [funnels, leadSheet] = await Promise.all([
      listLeadFunnelsForOrganization(admin, organization.id),
      resolveLeadSheetForOrganization(admin, organization.id),
    ])
    return NextResponse.json({
      funnels: funnels.map(serializeFunnel),
      // The webhook payload follows the client's active lead sheet.
      leadSheet: buildWebhookLeadSheetInfo(leadSheet),
      // Set when the sheet changed while webhooks existed; cleared by "Mark as reviewed".
      webhookStaleSince: organization.webhook_payload_stale_since ?? null,
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
    const organization = await getOrganizationBySlug(admin, slug)
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
