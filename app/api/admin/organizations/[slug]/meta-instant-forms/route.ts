import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import {
  collectMetaInstantFormAlertsDbOnly,
  collectMetaInstantFormAlertsLiveLight,
} from "@/lib/admin/meta-instant-form-alerts"
import { getMetaConfigRow } from "@/lib/db/meta-config-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { listMetaLeadFormsForOrganization } from "@/lib/db/meta-lead-forms-repository"
import { getLastMetaLeadInboundAt } from "@/lib/db/meta-lead-forms-repository"
import { buildInstantFormsView } from "@/lib/meta/instant-forms-view"
import {
  ensureLeadgenWebhooksWhenFormsEnabled,
  getMetaInstantFormsHealth,
  syncMetaInstantFormsCatalog,
} from "@/lib/meta/meta-instant-forms-service"
import { resolvePublicSiteUrl } from "@/lib/meta/public-site-url"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const url = new URL(request.url)
    const live = url.searchParams.get("live") === "1"

    const [metaConfig, rows, lastInboundAt] = await Promise.all([
      getMetaConfigRow(admin, organization.id),
      listMetaLeadFormsForOrganization(admin, organization.id),
      getLastMetaLeadInboundAt(admin, organization.id),
    ])

    const metaEnabled = Boolean(metaConfig?.enabled)
    const hasPage = Boolean(metaConfig?.meta_page_id?.trim())
    const canLoadForms = metaEnabled && hasPage

    let health: Awaited<ReturnType<typeof getMetaInstantFormsHealth>> | null = null
    let loadError: string | null = null

    const view = await buildInstantFormsView(admin, organization, rows)

    if (live && canLoadForms) {
      try {
        health = await getMetaInstantFormsHealth(admin, organization.id)
      } catch (error) {
        loadError =
          error instanceof Error ? error.message : "Could not connect to Meta for this Page."
        health = null
      }
      if (view.summary.enabled > 0 && health && !health.leadgenSubscribed) {
        try {
          health = await ensureLeadgenWebhooksWhenFormsEnabled(
            admin,
            organization.id,
            view.summary.enabled
          )
        } catch (error) {
          loadError =
            loadError ??
            (error instanceof Error
              ? error.message
              : "Could not subscribe Page to Meta lead webhooks.")
        }
      }
    }

    const alerts =
      live && canLoadForms
        ? await collectMetaInstantFormAlertsLiveLight(admin, organization.id, slug, health)
        : await collectMetaInstantFormAlertsDbOnly(admin, organization.id, slug)
    const siteUrl = resolvePublicSiteUrl(request)
    const webhookUrl = `${siteUrl}/api/webhooks/meta/leads`

    return NextResponse.json({
      ...view,
      health,
      alerts,
      lastInboundAt,
      webhookUrl,
      loadState: {
        metaEnabled,
        hasPage,
        canLoadForms,
        loadError,
        syncRecommended: false,
      },
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json()) as { action?: string }
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    if (body.action === "sync-catalog") {
      const { forms, questionsFailed } = await syncMetaInstantFormsCatalog(admin, organization.id)
      const view = await buildInstantFormsView(admin, organization, forms)
      return NextResponse.json({ ...view, questionsFailed })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
