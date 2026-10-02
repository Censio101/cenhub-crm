import {
  countRecentMetaInboundFailures,
  getLastMetaLeadInboundAt,
  listMetaLeadFormsForOrganization,
} from "@/lib/db/meta-lead-forms-repository"
import { getMetaConfigRow } from "@/lib/db/meta-config-repository"
import {
  findLeadgenFormIdsInActiveAds,
  getPageSubscriptionStatus,
  listLeadgenForms,
} from "@/lib/meta/leadgen-forms"
import {
  resolveMarketingAccessTokenForConfig,
  resolvePageAccessTokenForOrganization,
} from "@/lib/meta/resolve-page-access-token"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import type { SupabaseClient } from "@supabase/supabase-js"

export type MetaInstantFormAlert = {
  code: string
  severity: "error" | "warning" | "info"
  titleKey: string
  bodyKey?: string
  href?: string
  metaFormId?: string
}

/** Config + DB only — no Meta Graph calls. */
export async function collectMetaInstantFormAlertsDbOnly(
  supabase: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<MetaInstantFormAlert[]> {
  const alerts: MetaInstantFormAlert[] = []
  const config = await getMetaConfigRow(supabase, organizationId)
  if (!config?.enabled) {
    alerts.push({
      code: "meta_disabled",
      severity: "warning",
      titleKey: "metaAlertDisabled",
      href: adminClientSettingsSectionPath(slug, "meta"),
    })
    return alerts
  }
  if (!config.meta_page_id?.trim()) {
    alerts.push({
      code: "page_id_missing",
      severity: "error",
      titleKey: "metaAlertPageMissing",
      href: adminClientSettingsSectionPath(slug, "meta"),
    })
    return alerts
  }
  const failures = await countRecentMetaInboundFailures(supabase, organizationId, 24)
  if (failures > 0) {
    alerts.push({
      code: "recent_ingest_failures",
      severity: "warning",
      titleKey: "metaAlertIngestFailures",
      bodyKey: String(failures),
      href: adminClientSettingsSectionPath(slug, "meta-instant-forms"),
    })
  }
  return alerts
}

/** Live Meta checks for Overview — webhook status only (no ads scan, no full form list). */
export async function collectMetaInstantFormAlertsLiveLight(
  supabase: SupabaseClient,
  organizationId: string,
  slug: string,
  health: { leadgenSubscribed: boolean } | null
): Promise<MetaInstantFormAlert[]> {
  const alerts = await collectMetaInstantFormAlertsDbOnly(supabase, organizationId, slug)
  const href = adminClientSettingsSectionPath(slug, "meta-instant-forms")

  if (!health) {
    alerts.push({
      code: "page_token_missing",
      severity: "error",
      titleKey: "metaAlertPageToken",
      href,
    })
    return alerts
  }

  if (!health.leadgenSubscribed) {
    alerts.push({
      code: "webhook_not_subscribed",
      severity: "error",
      titleKey: "metaAlertWebhookNotSubscribed",
      href,
    })
  }

  return alerts
}

export async function collectMetaInstantFormAlertsForOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<MetaInstantFormAlert[]> {
  const alerts = await collectMetaInstantFormAlertsDbOnly(supabase, organizationId, slug)
  const href = adminClientSettingsSectionPath(slug, "meta-instant-forms")

  const config = await getMetaConfigRow(supabase, organizationId)
  if (!config?.enabled || !config.meta_page_id?.trim()) {
    return alerts
  }

  try {
    const { token, pageId } = await resolvePageAccessTokenForOrganization(supabase, organizationId)
    const subs = await getPageSubscriptionStatus(pageId, token)
    const subscribed = subs.some((s) => (s.subscribed_fields ?? []).includes("leadgen"))
    if (!subscribed) {
      alerts.push({
        code: "webhook_not_subscribed",
        severity: "error",
        titleKey: "metaAlertWebhookNotSubscribed",
        href,
      })
    }

    const forms = await listMetaLeadFormsForOrganization(supabase, organizationId)
    const marketingToken = resolveMarketingAccessTokenForConfig(config) || token
    const activeIds = config.meta_ad_account_id
      ? await findLeadgenFormIdsInActiveAds(config.meta_ad_account_id, marketingToken)
      : new Set<string>()

    for (const formId of activeIds) {
      const row = forms.find((f) => f.meta_form_id === formId)
      if (!row?.enabled) {
        alerts.push({
          code: "form_on_ad_not_enabled",
          severity: "warning",
          titleKey: "metaAlertFormOnAdNotEnabled",
          bodyKey: row?.name ?? formId,
          href,
          metaFormId: formId,
        })
      }
    }

    const graphForms = await listLeadgenForms(pageId, token)
    const newFormCount = graphForms.filter(
      (gf) => !forms.some((f) => f.meta_form_id === gf.id)
    ).length
    if (newFormCount > 0) {
      alerts.push({
        code: "new_forms_detected",
        severity: "info",
        titleKey: "metaAlertNewFormsSummary",
        bodyKey: String(newFormCount),
        href,
      })
    }
  } catch {
    alerts.push({
      code: "page_token_missing",
      severity: "error",
      titleKey: "metaAlertPageToken",
      href,
    })
  }

  void getLastMetaLeadInboundAt(supabase, organizationId)

  return alerts
}

export async function collectAllAdminMetaAlerts(
  supabase: SupabaseClient,
  organizations: Array<{ id: string; slug: string }>
): Promise<Array<MetaInstantFormAlert & { organizationSlug: string }>> {
  const out: Array<MetaInstantFormAlert & { organizationSlug: string }> = []
  for (const org of organizations.slice(0, 50)) {
    const alerts = await collectMetaInstantFormAlertsForOrganization(supabase, org.id, org.slug)
    for (const alert of alerts) {
      out.push({ ...alert, organizationSlug: org.slug })
    }
  }
  return out.slice(0, 30)
}
