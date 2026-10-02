import { NextResponse } from "next/server"

import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import { collectAllAdminMetaAlerts } from "@/lib/admin/meta-instant-form-alerts"
import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { countMetaFormsNeedingRemapByOrganization } from "@/lib/db/meta-lead-forms-repository"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    await requireCensioAdmin()
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("organizations")
      .select("id, slug, webhook_payload_stale_since, lead_sheet_changed_at")
      .order("name")
      .limit(100)

    if (error) throw error

    const orgs = (data ?? []).map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      webhookStaleSince: (row.webhook_payload_stale_since as string | null) ?? null,
      lead_sheet_changed_at: (row.lead_sheet_changed_at as string | null) ?? null,
    }))

    const metaAlerts = await collectAllAdminMetaAlerts(
      admin,
      orgs.map(({ id, slug }) => ({ id, slug }))
    )

    // Lead sheet changed while the client had webhooks: senders may need updating.
    const webhookAlerts = orgs
      .filter((org) => org.webhookStaleSince)
      .map((org) => ({
        code: "webhook_payload_stale",
        severity: "warning" as const,
        titleKey: "adminAlertWebhookPayloadStale",
        href: adminClientSettingsSectionPath(org.slug, "funnels"),
        organizationSlug: org.slug,
      }))

    // Mapped Meta forms saved before the lead sheet last changed need another look.
    const remapCounts = await countMetaFormsNeedingRemapByOrganization(admin, orgs)
    const remapAlerts = orgs
      .filter((org) => (remapCounts.get(org.id) ?? 0) > 0)
      .map((org) => ({
        code: "meta_mapping_remap",
        severity: "warning" as const,
        titleKey: "adminAlertMetaRemap",
        bodyKey: String(remapCounts.get(org.id)),
        href: adminClientSettingsSectionPath(org.slug, "meta-instant-forms"),
        organizationSlug: org.slug,
      }))

    const alerts = [...webhookAlerts, ...remapAlerts, ...metaAlerts]
    return NextResponse.json({ alerts, count: alerts.length })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
