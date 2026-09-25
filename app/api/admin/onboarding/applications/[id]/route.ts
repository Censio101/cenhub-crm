import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { getMetaConfigRow } from "@/lib/db/meta-config-repository"
import { deriveMetaClientStatus } from "@/lib/db/meta-clients-repository"
import { getOnboardingApplicationById } from "@/lib/db/onboarding-applications-repository"
import { getOrganizationById } from "@/lib/db/organizations-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const admin = createAdminClient()
    const application = await getOnboardingApplicationById(admin, id)
    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const organization = application.organization_id
      ? await getOrganizationById(admin, application.organization_id)
      : null

    let meta: {
      metaAdAccountId: string
      partnerAccountName: string
      metaPageId: string
      enabled: boolean
      needsSetup: boolean
      metaSyncStatus: string
      metaSyncError: string | null
    } | null = null

    if (organization) {
      const row = await getMetaConfigRow(admin, organization.id)
      if (row) {
        const derived = deriveMetaClientStatus({
          enabled: Boolean(row.enabled),
          metaAdAccountId: row.meta_ad_account_id ?? "",
          metaPageId: row.meta_page_id ?? "",
          metaSyncStatus: row.meta_sync_status ?? "",
        })
        const adId = row.meta_ad_account_id ?? ""
        const partnerAccountName = adId.trim() ? organization.name : ""
        meta = {
          metaAdAccountId: adId,
          partnerAccountName,
          metaPageId: row.meta_page_id ?? "",
          enabled: Boolean(row.enabled),
          needsSetup: derived.needsSetup,
          metaSyncStatus: row.meta_sync_status ?? "",
          metaSyncError: row.meta_sync_error ?? null,
        }
      } else {
        meta = {
          metaAdAccountId: "",
          partnerAccountName: "",
          metaPageId: "",
          enabled: false,
          needsSetup: true,
          metaSyncStatus: "",
          metaSyncError: null,
        }
      }
    }

    return NextResponse.json({
      application,
      organization: organization
        ? { id: organization.id, slug: organization.slug, name: organization.name }
        : null,
      meta,
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
