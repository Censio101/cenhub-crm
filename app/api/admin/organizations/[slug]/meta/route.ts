import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import {
  getMetaConfig,
  patchMetaEnabled,
  upsertMetaConfig,
} from "@/lib/db/meta-config-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { onboardMetaClient } from "@/lib/meta/onboard-meta-client"
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

    const config =
      (await getMetaConfig(admin, organization.id)) ?? {
        organizationId: organization.id,
        metaAdAccountId: "",
        metaPageId: "",
        metaPixelId: "",
        enabled: false,
        metaSyncStatus: "disabled",
        metaSyncError: null,
        metaLastSyncedAt: null,
      }

    return NextResponse.json({ config })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json()) as { enabled?: boolean }

    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 })
    }

    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const config = await patchMetaEnabled(admin, organization.id, body.enabled)
    const onboard = body.enabled
      ? await onboardMetaClient(admin, organization.id, {
          source: "admin-toggle",
        })
      : null

    return NextResponse.json({ config, onboard })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json()) as {
      metaAdAccountId?: string
      metaPageId?: string
      metaPixelId?: string
      enabled?: boolean
    }

    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const config = await upsertMetaConfig(admin, organization.id, {
      metaAdAccountId: body.metaAdAccountId?.trim(),
      metaPageId: body.metaPageId?.trim(),
      metaPixelId: body.metaPixelId?.trim(),
      enabled: body.enabled,
    })

    return NextResponse.json({ config })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
