import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { findFieldTypeConflicts } from "@/lib/lead-sheet/sheet-diff"
import { countMetaFormsNeedingRemap } from "@/lib/db/meta-lead-forms-repository"
import {
  getLeadSheetTemplateById,
  isTemplateAssignableToOrganization,
  listCustomFieldDefs,
  listLeadSheetTemplates,
  recordLeadSheetChangeForOrganizations,
  resolveLeadSheetForOrganization,
  setOrganizationLeadSheetTemplateId,
} from "@/lib/db/lead-sheet-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const supabase = createAdminClient()
    const org = await getOrganizationBySlug(supabase, slug)
    if (!org) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const [resolved, templates] = await Promise.all([
      resolveLeadSheetForOrganization(supabase, org.id),
      listLeadSheetTemplates(supabase, { organizationId: org.id, withColumnCounts: true }),
    ])

    return NextResponse.json({
      organizationId: org.id,
      templateId: org.lead_sheet_template_id ?? resolved?.template.id ?? null,
      resolved,
      templates,
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json()) as {
      templateId?: string
    }

    if (body.templateId === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const org = await getOrganizationBySlug(supabase, slug)
    if (!org) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const tpl = await getLeadSheetTemplateById(supabase, body.templateId)
    if (!tpl) {
      return NextResponse.json({ error: "Template not found" }, { status: 400 })
    }
    if (!isTemplateAssignableToOrganization(tpl.template, org.id)) {
      return NextResponse.json({ error: "Template not allowed for this client" }, { status: 400 })
    }
    const previous = await resolveLeadSheetForOrganization(supabase, org.id)
    await setOrganizationLeadSheetTemplateId(supabase, org.id, body.templateId)

    const resolved = await resolveLeadSheetForOrganization(supabase, org.id)

    // A different sheet changes the webhook payload. Only flag clients that already have a
    // webhook: the first assignment for a client without senders stays silent.
    const changed = previous?.template.id !== resolved?.template.id
    let webhookReviewNeeded = false
    let metaFormsNeedingRemap = 0
    if (changed) {
      try {
        const flagged = await recordLeadSheetChangeForOrganizations(supabase, [org.id])
        webhookReviewNeeded = flagged.includes(org.id)
      } catch (flagError) {
        console.error("recordLeadSheetChangeForOrganizations failed", flagError)
      }
      try {
        metaFormsNeedingRemap = await countMetaFormsNeedingRemap(
          supabase,
          org.id,
          resolved ? listCustomFieldDefs(resolved).map((f) => ({ key: f.fieldKey })) : []
        )
      } catch (remapError) {
        console.error("countMetaFormsNeedingRemap failed", remapError)
      }
    }

    return NextResponse.json({
      ok: true,
      resolved,
      webhookReviewNeeded,
      metaFormsNeedingRemap,
      typeConflicts: changed ? findFieldTypeConflicts(previous, resolved) : [],
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
