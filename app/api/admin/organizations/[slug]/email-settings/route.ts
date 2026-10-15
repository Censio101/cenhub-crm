import { NextResponse } from "next/server"

import {
  buildOrganizationEmailSettingsResponse,
  filterValidIncludedColumnKeys,
} from "@/lib/admin/organization-email-settings-response"
import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  getOrganizationEmailSettings,
  replaceNotifyFunnels,
  upsertOrganizationEmailSettings,
} from "@/lib/db/organization-email-settings-repository"
import { listLeadFunnelsForOrganization } from "@/lib/db/lead-funnels-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { resolveClientDashboardSheet } from "@/lib/db/lead-sheet-repository"
import { columnVisibilityKey } from "@/lib/lead-sheet/client-visibility"
import { validateNotifyEmailList } from "@/lib/onboarding/notify-emails"
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

    const settings = await buildOrganizationEmailSettingsResponse(admin, organization)
    return NextResponse.json({ settings })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    if (body.extraNotifyEmails !== undefined && body.extraNotifyEmails !== null) {
      const validated = validateNotifyEmailList(String(body.extraNotifyEmails))
      if (!validated.ok) {
        return NextResponse.json(
          { error: `Invalid email: ${validated.invalid.join(", ")}` },
          { status: 400 }
        )
      }
      body.extraNotifyEmails = validated.normalized ?? ""
    }

    const existing = await getOrganizationEmailSettings(admin, organization.id)
    const dashboardSheet = await resolveClientDashboardSheet(admin, organization.id)
    const allowedColumnKeys = new Set(
      (dashboardSheet.visible?.columns ?? []).map((column) => columnVisibilityKey(column))
    )

    let notifyIncludedColumnKeys: string[] | undefined
    let strippedColumnKeys: string[] = []
    if (body.notifyIncludedColumnKeys !== undefined) {
      if (!Array.isArray(body.notifyIncludedColumnKeys)) {
        return NextResponse.json({ error: "notifyIncludedColumnKeys must be an array" }, { status: 400 })
      }
      const filtered = filterValidIncludedColumnKeys(
        body.notifyIncludedColumnKeys.filter((entry): entry is string => typeof entry === "string"),
        allowedColumnKeys
      )
      notifyIncludedColumnKeys = filtered.valid
      strippedColumnKeys = filtered.stripped
    }

    let notifyFunnelIds: string[] | undefined
    if (body.notifyFunnelIds !== undefined) {
      if (!Array.isArray(body.notifyFunnelIds)) {
        return NextResponse.json({ error: "notifyFunnelIds must be an array" }, { status: 400 })
      }
      const orgFunnels = await listLeadFunnelsForOrganization(admin, organization.id)
      const allowed = new Set(orgFunnels.map((funnel) => funnel.id))
      notifyFunnelIds = body.notifyFunnelIds.filter(
        (id): id is string => typeof id === "string" && allowed.has(id)
      )
    }

    await upsertOrganizationEmailSettings(
      admin,
      organization.id,
      {
        leadNotifyEnabled:
          typeof body.leadNotifyEnabled === "boolean" ? body.leadNotifyEnabled : undefined,
        mailgunApiKey:
          body.mailgunApiKey === undefined
            ? undefined
            : body.mailgunApiKey === "" || body.mailgunApiKey === null
              ? null
              : String(body.mailgunApiKey),
        mailgunDomain:
          body.mailgunDomain === undefined ? undefined : String(body.mailgunDomain ?? ""),
        mailgunApiBase:
          body.mailgunApiBase === undefined ? undefined : String(body.mailgunApiBase ?? ""),
        mailFrom: body.mailFrom === undefined ? undefined : String(body.mailFrom ?? ""),
        mailFromName:
          body.mailFromName === undefined ? undefined : String(body.mailFromName ?? ""),
        usePrimaryContact:
          typeof body.usePrimaryContact === "boolean" ? body.usePrimaryContact : undefined,
        extraNotifyEmails:
          body.extraNotifyEmails === undefined ? undefined : String(body.extraNotifyEmails ?? ""),
        notifySubjectTemplate:
          body.notifySubjectTemplate === undefined
            ? undefined
            : String(body.notifySubjectTemplate ?? ""),
        notifyIntroTemplate:
          body.notifyIntroTemplate === undefined
            ? undefined
            : String(body.notifyIntroTemplate ?? ""),
        notifyClosingTemplate:
          body.notifyClosingTemplate === undefined
            ? undefined
            : String(body.notifyClosingTemplate ?? ""),
        notifyIncludedColumnKeys,
      },
      existing
    )

    if (notifyFunnelIds !== undefined) {
      await replaceNotifyFunnels(admin, organization.id, notifyFunnelIds)
    }

    const settings = await buildOrganizationEmailSettingsResponse(admin, organization)
    return NextResponse.json({
      settings,
      ...(strippedColumnKeys.length > 0 ? { strippedColumnKeys } : {}),
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
