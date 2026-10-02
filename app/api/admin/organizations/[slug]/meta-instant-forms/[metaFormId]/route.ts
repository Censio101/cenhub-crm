import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import {
  getMetaLeadFormByMetaFormId,
  metaFormMappingStatuses,
  patchMetaLeadForm,
} from "@/lib/db/meta-lead-forms-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import {
  validateMetaFieldMappingForEnable,
  type MetaFieldMapping,
} from "@/lib/meta/meta-field-mapping"
import { loadLeadSheetInfo } from "@/lib/meta/instant-forms-view"
import { ensureLeadgenWebhooksWhenFormsEnabled } from "@/lib/meta/meta-instant-forms-service"
import { listMetaLeadFormsForOrganization } from "@/lib/db/meta-lead-forms-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string; metaFormId: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug, metaFormId } = await context.params
    const body = (await request.json()) as {
      enabled?: boolean
      fieldMapping?: MetaFieldMapping
      /** "Keep mapping as is": marks the current mapping as checked against the lead sheet. */
      markMappingReviewed?: boolean
    }
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const existing = await getMetaLeadFormByMetaFormId(admin, organization.id, metaFormId)
    if (!existing) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    const nextEnabled = body.enabled !== undefined ? body.enabled : existing.enabled
    const nextMapping = body.fieldMapping ?? existing.field_mapping ?? {}

    if (nextEnabled) {
      const validation = validateMetaFieldMappingForEnable(nextMapping)
      if (!validation.ok) {
        return NextResponse.json(
          {
            error: "Mapping does not meet minimum requirements.",
            code: validation.code,
          },
          { status: 400 }
        )
      }
    }

    const form = await patchMetaLeadForm(admin, organization.id, metaFormId, {
      enabled: body.enabled,
      fieldMapping: body.fieldMapping,
      markMappingReviewed: body.markMappingReviewed,
    })

    // Fresh remap status, so the page can update this row without reloading the list.
    const { customFields } = await loadLeadSheetInfo(admin, organization.id)
    const mappingStatus =
      metaFormMappingStatuses([form], customFields, organization.lead_sheet_changed_at ?? null).get(
        form.meta_form_id
      ) ?? null

    let health: Awaited<ReturnType<typeof ensureLeadgenWebhooksWhenFormsEnabled>> = null
    let webhookSubscribeError: string | null = null
    // Only when a form is being switched on: saving or re-checking a mapping does not need Meta,
    // and a Meta hiccup must not show up as an error on a save that succeeded.
    if (form.enabled && body.enabled === true) {
      const rows = await listMetaLeadFormsForOrganization(admin, organization.id)
      const enabledCount = rows.filter((row) => row.enabled).length
      try {
        health = await ensureLeadgenWebhooksWhenFormsEnabled(admin, organization.id, enabledCount)
      } catch (error) {
        webhookSubscribeError =
          error instanceof Error ? error.message : "Could not subscribe Page to Meta webhooks."
      }
    }

    return NextResponse.json({ form: { ...form, mappingStatus }, health, webhookSubscribeError })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
