"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangleIcon } from "lucide-react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import type { WebhookCustomFieldSpec } from "@/lib/lead-sheet/webhook-spec"
import {
  MetaFormMappingDialog,
  type MappingDialogMode,
} from "@/components/admin/meta-instant-forms/MetaFormMappingDialog"
import { MetaInstantFormsLeadsCheckTab } from "@/components/admin/meta-instant-forms/MetaInstantFormsLeadsCheckTab"
import { MetaInstantFormsPageHeader } from "@/components/admin/meta-instant-forms/MetaInstantFormsPageHeader"
import { MetaInstantFormsTableSkeleton } from "@/components/admin/meta-instant-forms/MetaInstantFormsTableSkeleton"
import { MetaInstantFormsRealtimeSection } from "@/components/admin/meta-instant-forms/MetaInstantFormsRealtimeSection"
import { MetaInstantFormsRealtimeWebhooksBar } from "@/components/admin/meta-instant-forms/MetaInstantFormsRealtimeWebhooksBar"
import { MetaInstantFormsSummaryBar } from "@/components/admin/meta-instant-forms/MetaInstantFormsSummary"
import { MetaInstantFormsTable } from "@/components/admin/meta-instant-forms/MetaInstantFormsTable"
import {
  MetaInstantFormsTabNav,
  useMetaInstantFormsTab,
} from "@/components/admin/meta-instant-forms/MetaInstantFormsTabNav"
import type {
  MetaInstantFormAlertRow,
  MetaInstantFormRow,
  MetaInstantFormsFilter,
  MetaInstantFormsLoadState,
  MetaInstantFormsSummary,
} from "@/components/admin/meta-instant-forms/types"
import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { Button } from "@/components/ui/button"
import { FormNoticeStack } from "@/components/ui/form-notice"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import type { Messages } from "@/lib/i18n/locales/da"
import type { MetaFieldMapping } from "@/lib/meta/meta-field-mapping"
import { cn } from "cn"
import { useAsyncEffect } from "@/lib/react/use-async-effect"

function summarizeForms(forms: MetaInstantFormRow[]): MetaInstantFormsSummary {
  return {
    total: forms.length,
    enabled: forms.filter((form) => form.enabled).length,
    activeInAds: 0,
    activeNotEnabled: 0,
  }
}

type LeadSheetInfo = {
  templateName: string
  isSystemDefault: boolean
  isClientOwned: boolean
}

type FormsView = {
  forms: MetaInstantFormRow[]
  customFields?: WebhookCustomFieldSpec[]
  leadSheet?: LeadSheetInfo | null
  catalogSyncedAt?: string | null
}

type PanelSnapshot = {
  view: FormsView
  alerts: MetaInstantFormAlertRow[]
  webhookUrl: string
  lastInboundAt: string | null
  loadState: MetaInstantFormsLoadState
}

/**
 * Last data shown per client, so coming back to this page paints instantly from memory while a
 * quiet refresh from our database runs. Never talks to Meta.
 */
const snapshotCache = new Map<string, PanelSnapshot>()

const emptyLoadState: MetaInstantFormsLoadState = {
  metaEnabled: false,
  hasPage: false,
  canLoadForms: false,
  loadError: null,
  syncRecommended: false,
}

export function AdminClientMetaInstantFormsPanel() {
  const { slug, metaConfig } = useAdminClient()
  const { t } = useLanguage()
  const [tab, setTab] = useMetaInstantFormsTab()

  const [cached] = useState(() => snapshotCache.get(slug) ?? null)
  const [forms, setForms] = useState<MetaInstantFormRow[]>(cached?.view.forms ?? [])
  const [customFields, setCustomFields] = useState<WebhookCustomFieldSpec[]>(
    cached?.view.customFields ?? []
  )
  const [leadSheet, setLeadSheet] = useState<LeadSheetInfo | null>(cached?.view.leadSheet ?? null)
  const [syncedAt, setSyncedAt] = useState<string | null>(cached?.view.catalogSyncedAt ?? null)
  const summary = useMemo(() => summarizeForms(forms), [forms])
  const [loadState, setLoadState] = useState<MetaInstantFormsLoadState>(
    cached?.loadState ?? emptyLoadState
  )
  const [alerts, setAlerts] = useState<MetaInstantFormAlertRow[]>(cached?.alerts ?? [])
  const [webhookUrl, setWebhookUrl] = useState(cached?.webhookUrl ?? "")
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [lastInboundAt, setLastInboundAt] = useState<string | null>(cached?.lastInboundAt ?? null)
  const [filter, setFilter] = useState<MetaInstantFormsFilter>("all")
  const [loading, setLoading] = useState(cached === null)
  const [metaFormsHydrated, setMetaFormsHydrated] = useState(cached !== null)
  const [healthChecked, setHealthChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const [mappingForm, setMappingForm] = useState<MetaInstantFormRow | null>(null)
  const [mappingMode, setMappingMode] = useState<MappingDialogMode>("configure")
  const metaConfigSyncKey = useRef<string | null>(null)
  const liveHealthLoaded = useRef(false)
  const autoCatalogSyncSlug = useRef<string | null>(null)
  const lastPageId = useRef<string | null>(null)
  const pathname = usePathname() ?? ""
  const formsTabHref =
    pathname.split("?")[0] || adminClientSettingsSectionPath(slug, "meta-instant-forms")

  const applyFormsView = useCallback((view: FormsView) => {
    setForms(view.forms)
    if (view.customFields) setCustomFields(view.customFields)
    if (view.leadSheet !== undefined) setLeadSheet(view.leadSheet)
    if (view.catalogSyncedAt !== undefined) setSyncedAt(view.catalogSyncedAt)
  }, [])

  const applyPayload = useCallback(
    (
      data: FormsView & {
        alerts: MetaInstantFormAlertRow[]
        webhookUrl: string
        health: { leadgenSubscribed: boolean } | null
        lastInboundAt: string | null
        loadState?: MetaInstantFormsLoadState
      }
    ) => {
      applyFormsView(data)
      setAlerts(data.alerts)
      setWebhookUrl(data.webhookUrl)
      if (data.health != null) setSubscribed(data.health.leadgenSubscribed)
      setLastInboundAt(data.lastInboundAt)
      if (data.loadState) setLoadState(data.loadState)
    },
    [applyFormsView]
  )

  const load = useCallback(
    async (options?: { silent?: boolean; live?: boolean }) => {
      if (!slug) return
      if (!options?.silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const qs = options?.live ? "?live=1" : ""
        const response = await fetch(`/api/admin/organizations/${slug}/meta-instant-forms${qs}`)
        if (!response.ok) throw new Error("load")
        const data = (await response.json()) as Parameters<typeof applyPayload>[0]
        applyPayload(data)
        return data
      } catch {
        if (!options?.silent) setError(t("metaInstantFormsLoadError"))
        return null
      } finally {
        if (!options?.silent) setLoading(false)
        if (options?.live) {
          setHealthChecked(true)
        } else {
          setMetaFormsHydrated(true)
        }
      }
    },
    [slug, t, applyPayload]
  )

  const syncCatalog = useCallback(
    async (options?: { quiet?: boolean }) => {
      if (!slug) return false
      setBusy("sync")
      try {
        const response = await fetch(`/api/admin/organizations/${slug}/meta-instant-forms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sync-catalog" }),
        })
        const data = (await response.json().catch(() => ({}))) as FormsView & {
          error?: string
          questionsFailed?: number
        }
        if (!response.ok) {
          setError(
            data.error
              ? `${t("metaInstantFormsLoadError")} (${data.error})`
              : t("metaInstantFormsLoadError")
          )
          return false
        }
        applyFormsView(data)
        if (data.questionsFailed) {
          setError(t("metaInstantFormsQuestionsPartial"))
        } else if (!options?.quiet) {
          setNotice(t("metaInstantFormsCatalogSynced"))
        }
        return true
      } catch {
        setError(t("metaInstantFormsLoadError"))
        return false
      } finally {
        setBusy(null)
      }
    },
    [slug, t, applyFormsView]
  )

  useAsyncEffect(() => {
    void load({ silent: cached !== null })
  }, [load])

  const metaEnabled = Boolean(metaConfig?.enabled)
  const hasPage = Boolean(metaConfig?.metaPageId?.trim())
  const canLoadForms = metaEnabled && hasPage
  const metaConnected = canLoadForms

  const metaPageId = metaConfig ? (metaConfig.metaPageId ?? "").trim() : null

  useEffect(() => {
    const key = `${slug}:${metaEnabled}:${hasPage}`
    if (metaConfigSyncKey.current === null) {
      metaConfigSyncKey.current = key
      return
    }
    if (metaConfigSyncKey.current === key) return
    metaConfigSyncKey.current = key
    liveHealthLoaded.current = false
    autoCatalogSyncSlug.current = null
    setHealthChecked(false)
    setMetaFormsHydrated(false)
    void load({ silent: true })
  }, [slug, metaEnabled, hasPage, load])

  // A different Facebook Page was linked: the saved forms belong to the old one, so refresh.
  useEffect(() => {
    if (metaPageId === null) return
    const previous = lastPageId.current
    lastPageId.current = metaPageId
    if (previous === null || previous === metaPageId || !canLoadForms) return
    void syncCatalog({ quiet: true })
  }, [metaPageId, canLoadForms, syncCatalog])

  useEffect(() => {
    liveHealthLoaded.current = false
  }, [slug])

  useEffect(() => {
    if (tab !== "forms" || !canLoadForms || loading || busy === "sync") return
    if (summary.total > 0) return
    if (autoCatalogSyncSlug.current === slug) return
    autoCatalogSyncSlug.current = slug
    void syncCatalog({ quiet: true })
  }, [tab, canLoadForms, loading, busy, summary.total, slug, syncCatalog])

  // Meta is only asked about the Page's webhook status, and only where it is shown (Overview).
  useEffect(() => {
    if (tab !== "overview" || !canLoadForms || !metaFormsHydrated || liveHealthLoaded.current) {
      return
    }
    liveHealthLoaded.current = true
    void load({ silent: true, live: true })
  }, [tab, canLoadForms, metaFormsHydrated, load])

  async function turnOnRealtimeWebhooks() {
    if (!slug) return
    setBusy("webhooks")
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/organizations/${slug}/meta-instant-forms/subscribe-webhooks`,
        { method: "POST" }
      )
      if (!response.ok) throw new Error("sub")
      const data = (await response.json()) as { health: { leadgenSubscribed: boolean } }
      setSubscribed(data.health.leadgenSubscribed)
      if (data.health.leadgenSubscribed) {
        setNotice(t("metaInstantFormsRealtimeWebhooksTurnOnSuccess"))
      } else {
        setError(t("metaInstantFormsLoadError"))
      }
    } catch {
      setError(t("metaInstantFormsLoadError"))
    } finally {
      setBusy(null)
    }
  }

  const filteredForms = useMemo(() => {
    switch (filter) {
      case "enabled":
        return forms.filter((f) => f.enabled)
      case "disabled":
        return forms.filter((f) => !f.enabled)
      default:
        return forms
    }
  }, [forms, filter])

  const hasEnabledForm = summary.enabled > 0

  useEffect(() => {
    if (!metaFormsHydrated) return
    snapshotCache.set(slug, {
      view: { forms, customFields, leadSheet, catalogSyncedAt: syncedAt },
      alerts,
      webhookUrl,
      lastInboundAt,
      loadState,
    })
  }, [
    slug,
    metaFormsHydrated,
    forms,
    customFields,
    leadSheet,
    syncedAt,
    alerts,
    webhookUrl,
    lastInboundAt,
    loadState,
  ])

  const visibleAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        if (alert.code === "meta_disabled" && metaEnabled) return false
        if (alert.code === "page_id_missing" && hasPage) return false
        return true
      }),
    [alerts, metaEnabled, hasPage]
  )

  /**
   * Saves one form. Errors show where the admin is looking: inside the popup when it came from
   * there (the page behind the overlay is out of sight), otherwise in the page notice.
   */
  async function patchForm(
    metaFormId: string,
    patch: { enabled?: boolean; fieldMapping?: MetaFieldMapping; markMappingReviewed?: boolean },
    surface: "page" | "dialog" = "page"
  ) {
    if (!slug || busy === metaFormId) return false
    const fail = (message: string) => {
      if (surface === "dialog") setDialogError(message)
      else setError(message)
      return false
    }
    setBusy(metaFormId)
    if (surface === "dialog") setDialogError(null)
    try {
      const response = await fetch(
        `/api/admin/organizations/${slug}/meta-instant-forms/${metaFormId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: patch.enabled,
            fieldMapping: patch.fieldMapping,
            markMappingReviewed: patch.markMappingReviewed,
          }),
        }
      )
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { code?: string }
        if (body.code === "mapping_name_required") {
          return fail(t("metaInstantFormsMappingValidationName"))
        }
        if (body.code === "mapping_contact_required") {
          return fail(t("metaInstantFormsMappingValidationContact"))
        }
        return fail(t("metaInstantFormsSaveError"))
      }
      const body = (await response.json()) as {
        form: MetaInstantFormRow
        health?: { leadgenSubscribed: boolean } | null
        webhookSubscribeError?: string | null
      }
      if (body.health) {
        setSubscribed(body.health.leadgenSubscribed)
      } else if (body.form.enabled && body.webhookSubscribeError) {
        setSubscribed(false)
        setError(`${t("metaInstantFormsWebhookWarning")} (${body.webhookSubscribeError})`)
      }
      // The response already carries the fresh row and its remap status: no list reload.
      setForms((prev) =>
        prev.map((row) =>
          row.meta_form_id === metaFormId
            ? {
                ...row,
                enabled: body.form.enabled,
                field_mapping: body.form.field_mapping ?? row.field_mapping,
                mappingStatus: body.form.mappingStatus ?? null,
              }
            : row
        )
      )
      setNotice(t("metaInstantFormsSaved"))
      return true
    } catch {
      return fail(t("metaInstantFormsSaveError"))
    } finally {
      setBusy(null)
    }
  }

  function openMapping(form: MetaInstantFormRow, mode: MappingDialogMode) {
    setDialogError(null)
    setMappingForm(form)
    setMappingMode(mode)
  }

  async function saveMapping(mapping: MetaFieldMapping, enableAfter: boolean) {
    if (!mappingForm) return
    const ok = await patchForm(
      mappingForm.meta_form_id,
      { fieldMapping: mapping, enabled: enableAfter ? true : mappingForm.enabled },
      "dialog"
    )
    if (ok) setMappingForm(null)
  }

  async function keepMappingAsIs() {
    if (!mappingForm) return
    const ok = await patchForm(mappingForm.meta_form_id, { markMappingReviewed: true }, "dialog")
    if (ok) setMappingForm(null)
  }

  const formsNeedingRemap = useMemo(
    () => forms.filter((form) => form.mappingStatus?.needsRemap),
    [forms]
  )

  const topAlerts = visibleAlerts.slice(0, 3)
  const busyGlobal = busy !== null
  // The table stays visible during a Refresh; only an empty list shows the loading state.
  const catalogLoading =
    forms.length === 0 && (busy === "sync" || (tab === "forms" && canLoadForms && loading))

  const overviewSectionLoading =
    tab === "overview" && (!metaFormsHydrated || (canLoadForms && !healthChecked))

  const filterEmptyMessageKey = useMemo((): keyof Messages | null => {
    if (forms.length === 0 || filteredForms.length > 0) return null
    switch (filter) {
      case "enabled":
        return "metaInstantFormsFilterEmptyEnabled"
      case "disabled":
        return "metaInstantFormsFilterEmptyDisabled"
      default:
        return null
    }
  }, [forms.length, filteredForms.length, filter])

  const prereqBanner = !metaEnabled ? (
    <div
      className={cn(
        adminSectionCardClass,
        "border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      )}
    >
      {t("metaInstantFormsPrereqMeta")}{" "}
      <Link
        href={adminClientSettingsSectionPath(slug, "meta")}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("metaInstantFormsOpenMetaSettings")}
      </Link>
    </div>
  ) : !hasPage ? (
    <div
      className={cn(
        adminSectionCardClass,
        "border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      )}
    >
      {t("metaInstantFormsPrereqPage")}{" "}
      <Link
        href={adminClientSettingsSectionPath(slug, "meta")}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("metaInstantFormsOpenMetaSettings")}
      </Link>
    </div>
  ) : null

  const graphErrorBanner =
    metaConnected && loadState.loadError ? (
      <p
        className={cn(
          adminSectionCardClass,
          "border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        )}
        role="alert"
      >
        {t("metaInstantFormsGraphError")}
        <span className="mt-1 block text-xs opacity-90">{loadState.loadError}</span>
      </p>
    ) : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t("metaInstantFormsTitle")}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("metaInstantFormsIntro")}</p>
      </div>

      <MetaInstantFormsTabNav active={tab} onChange={setTab} />

      {prereqBanner}
      {graphErrorBanner}

      {tab !== "leads" && formsNeedingRemap.length > 0 ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-950">
                {t("metaInstantFormsRemapBannerTitle")}
              </p>
              <p className="mt-0.5 text-sm text-amber-900">
                {t("metaInstantFormsRemapBannerBody").replace(
                  "{count}",
                  String(formsNeedingRemap.length)
                )}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-amber-400 bg-white text-amber-950 hover:bg-amber-100"
            onClick={() => {
              setTab("forms")
              openMapping(formsNeedingRemap[0], "configure")
            }}
          >
            {t("metaInstantFormsRemapBannerAction")}
          </Button>
        </div>
      ) : null}

      {tab !== "leads" ? (
        <FormNoticeStack
          error={error}
          success={notice}
          onDismissError={() => setError(null)}
          onDismissSuccess={() => setNotice(null)}
          dismissLabel={t("noticeDismiss")}
          size={adminFormNoticeDefaults.size}
          successAutoDismissMs={adminFormNoticeDefaults.quickSuccessAutoDismissMs}
          errorAutoDismissMs={adminFormNoticeDefaults.errorAutoDismissMs}
        />
      ) : null}

      {tab === "overview" ? (
        <div className="space-y-6">
          <MetaInstantFormsPageHeader
            slug={slug}
            formsTabHref={formsTabHref}
            metaConnected={metaConnected}
            formsLoaded={summary.total > 0}
            hasEnabledForm={hasEnabledForm}
            webhooksOk={subscribed === true}
            loading={overviewSectionLoading}
          />

          <MetaInstantFormsRealtimeWebhooksBar
            canLoadForms={canLoadForms}
            hasEnabledForm={hasEnabledForm}
            subscribed={subscribed}
            checking={canLoadForms && (!metaFormsHydrated || !healthChecked)}
            busy={busy === "webhooks"}
            onTurnOn={() => void turnOnRealtimeWebhooks()}
          />

          {!overviewSectionLoading && topAlerts.length > 0 ? (
            <ul className="space-y-2">
              {topAlerts.map((alert) => (
                <li
                  key={`${alert.code}-${alert.bodyKey ?? ""}`}
                  className={cn(
                    adminSectionCardClass,
                    "px-4 py-3 text-sm",
                    alert.severity === "error" && "border-red-300 bg-red-50 text-red-900",
                    alert.severity === "warning" && "border-amber-300 bg-amber-50 text-amber-950"
                  )}
                >
                  {t(alert.titleKey as "metaAlertWebhookNotSubscribed")}
                  {alert.bodyKey ? `: ${alert.bodyKey}` : null}
                </li>
              ))}
              {visibleAlerts.length > 3 ? (
                <li className="text-xs text-muted-foreground">
                  {t("metaInstantFormsAlertsShowAll")}
                </li>
              ) : null}
            </ul>
          ) : null}

          {!overviewSectionLoading && summary.total > 0 ? (
            <MetaInstantFormsSummaryBar
              summary={summary}
              filter={filter}
              onFilterChange={setFilter}
              interactive={false}
            />
          ) : null}

          <MetaInstantFormsRealtimeSection
            webhookUrl={webhookUrl}
            lastInboundAt={lastInboundAt}
            busy={busyGlobal}
            loading={overviewSectionLoading}
            defaultOpen
          />
        </div>
      ) : null}

      {tab === "forms" ? (
        <div className="space-y-4">
          {summary.total > 0 ? (
            <MetaInstantFormsSummaryBar
              summary={summary}
              filter={filter}
              onFilterChange={setFilter}
              onRefresh={() => void syncCatalog({ quiet: false })}
              refreshDisabled={busyGlobal || !canLoadForms}
              refreshBusy={busy === "sync"}
              syncedAt={syncedAt}
            />
          ) : null}

          {/* Plain loading reads our database, so it only gets a skeleton. Meta is named only
              while a Refresh is actually talking to Meta. */}
          {catalogLoading && busy === "sync" ? (
            <p className="text-sm text-muted-foreground">{t("metaInstantFormsSyncingCatalog")}</p>
          ) : null}

          {catalogLoading ? (
            <MetaInstantFormsTableSkeleton />
          ) : forms.length === 0 ? (
            <div className={cn(adminSectionCardClass, "space-y-3 px-4 py-10 text-center")}>
              <p className="font-medium">{t("metaInstantFormsEmptyTitle")}</p>
              {canLoadForms ? (
                <p className="text-sm text-muted-foreground">{t("metaInstantFormsEmptyBody")}</p>
              ) : null}
              {canLoadForms && error ? (
                <Button
                  type="button"
                  disabled={busyGlobal}
                  onClick={() => {
                    autoCatalogSyncSlug.current = null
                    void syncCatalog({ quiet: false })
                  }}
                >
                  {busy === "sync"
                    ? t("metaInstantFormsSyncingCatalog")
                    : t("metaInstantFormsFetchFromMeta")}
                </Button>
              ) : null}
            </div>
          ) : filterEmptyMessageKey ? (
            <div
              className={cn(
                adminSectionCardClass,
                "px-4 py-10 text-center text-sm text-muted-foreground"
              )}
            >
              {t(filterEmptyMessageKey)}
            </div>
          ) : (
            <MetaInstantFormsTable
              forms={filteredForms}
              busyFormId={
                busy && busy !== "sync" && busy !== "subscribe" && busy !== "import" ? busy : null
              }
              onConfigure={(form) => openMapping(form, "configure")}
              onEnable={(form) => openMapping(form, "enable")}
              onDisable={(form) => void patchForm(form.meta_form_id, { enabled: false })}
            />
          )}
        </div>
      ) : null}

      {tab === "leads" ? (
        <MetaInstantFormsLeadsCheckTab
          slug={slug}
          canLoadForms={canLoadForms}
          metaSettingsHref={adminClientSettingsSectionPath(slug, "meta")}
        />
      ) : null}

      <MetaFormMappingDialog
        form={mappingForm}
        customFields={customFields}
        leadSheet={leadSheet}
        mode={mappingMode}
        open={mappingForm !== null}
        busy={busy === mappingForm?.meta_form_id}
        error={dialogError}
        onClose={() => {
          setMappingForm(null)
          setDialogError(null)
        }}
        onSave={saveMapping}
        onKeepAsIs={keepMappingAsIs}
      />
    </div>
  )
}
