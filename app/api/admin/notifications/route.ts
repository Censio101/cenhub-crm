import { NextResponse } from "next/server"

import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import { isOrganizationProfileComplete } from "@/lib/organization-profile"
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
      .select(
        "id, slug, name, primary_contact_name, primary_contact_email, primary_contact_phone, address, zip_code, city, webhook_payload_stale_since, lead_sheet_changed_at"
      )
      .order("name")
      .limit(100)

    if (error) throw error

    const rows = data ?? []
    const orgs = rows.map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      primary_contact_name: (row.primary_contact_name as string | null) ?? null,
      primary_contact_email: (row.primary_contact_email as string | null) ?? null,
      primary_contact_phone: (row.primary_contact_phone as string | null) ?? null,
      address: (row.address as string | null) ?? null,
      zip_code: (row.zip_code as string | null) ?? null,
      city: (row.city as string | null) ?? null,
      webhookStaleSince: (row.webhook_payload_stale_since as string | null) ?? null,
      lead_sheet_changed_at: (row.lead_sheet_changed_at as string | null) ?? null,
    }))

    const metaAlerts = await collectAllAdminMetaAlerts(
      admin,
      orgs.map(({ id, slug }) => ({ id, slug }))
    )

    // Lead sheet changed while the client had webhooks: senders may need updating.
    const profileAlerts = orgs
      .filter((org) => !isOrganizationProfileComplete(org))
      .map((org) => ({
        code: "organization_profile_incomplete",
        severity: "warning" as const,
        titleKey: "adminAlertProfileIncomplete",
        href: adminClientSettingsSectionPath(org.slug, "company"),
        organizationSlug: org.slug,
      }))

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

    const alerts = [...profileAlerts, ...webhookAlerts, ...remapAlerts, ...metaAlerts]
    return NextResponse.json({ alerts, count: alerts.length })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
