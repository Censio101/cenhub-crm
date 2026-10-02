"use client"

import Link from "next/link"
import { useState } from "react"
import { AlertTriangleIcon, XIcon } from "lucide-react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import { adminOutlineButtonClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { ChangeSheetDialog } from "@/components/admin/client-lead-sheet/ChangeSheetDialog"
import { ClientDashboardColumns } from "@/components/admin/client-lead-sheet/ClientDashboardColumns"
import { ClientLeadSheetHero } from "@/components/admin/client-lead-sheet/ClientLeadSheetHero"
import { ClientLeadSheetTabs } from "@/components/admin/client-lead-sheet/ClientLeadSheetTabs"
import { ClientLeadSheetUniquePanel } from "@/components/admin/client-lead-sheet/ClientLeadSheetUniquePanel"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { FormNoticeStack } from "@/components/ui/form-notice"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import { useAdminClientLeadSheet } from "@/hooks/useAdminClientLeadSheet"
import { cn } from "cn"

function PanelSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className={cn(adminSectionCardClass, "space-y-4 p-4 sm:p-5")}>
        <div className="flex items-center gap-3">
          <div className="skeleton-shimmer size-9 shrink-0 rounded-lg" />
          <div className="space-y-1.5">
            <div className="skeleton-shimmer h-3 w-20 rounded-md" />
            <div className="skeleton-shimmer h-5 w-44 rounded-md" />
          </div>
        </div>
        <div className="skeleton-shimmer h-10 w-full rounded-xl" />
      </div>
      <div className="skeleton-shimmer h-11 w-64 rounded-xl" />
      <div className={cn(adminSectionCardClass, "space-y-3 p-4 sm:p-5")}>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton-shimmer h-9 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export function ClientLeadSheetPanel() {
  const { slug, organization } = useAdminClient()
  const { t } = useLanguage()
  const clientName = organization?.name?.trim() || slug || ""
  const leadSheet = useAdminClientLeadSheet(slug, clientName)
  const {
    loading,
    error,
    notice,
    setError,
    setNotice,
    savedIsClientOwned,
    resolved,
    webhookReviewNeeded,
    metaFormsNeedingRemap,
    typeConflicts,
    dismissWebhookReview,
  } = leadSheet

  const [tab, setTab] = useState<"dashboard" | "columns">("dashboard")
  const [changing, setChanging] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t("leadSheetClientAssignTitle")}</h2>
      </div>

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

      {webhookReviewNeeded || metaFormsNeedingRemap > 0 || typeConflicts.length > 0 ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3"
        >
          <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
          <div className="min-w-0 flex-1 space-y-2 text-sm text-amber-950">
            {webhookReviewNeeded ? (
              <div>
                <p className="font-semibold">{t("webhookReviewCalloutTitle")}</p>
                <p className="mt-0.5 text-amber-900">{t("webhookReviewCalloutBody")}</p>
                <Link
                  href={adminClientSettingsSectionPath(slug, "funnels")}
                  className="mt-1.5 inline-block font-medium text-amber-950 underline underline-offset-2"
                >
                  {t("webhookReviewCalloutLink")}
                </Link>
              </div>
            ) : null}
            {metaFormsNeedingRemap > 0 ? (
              <div>
                <p className="font-semibold">{t("metaRemapCalloutTitle")}</p>
                <p className="mt-0.5 text-amber-900">
                  {t("metaRemapCalloutBody").replace("{count}", String(metaFormsNeedingRemap))}
                </p>
                <Link
                  href={adminClientSettingsSectionPath(slug, "meta-instant-forms")}
                  className="mt-1.5 inline-block font-medium text-amber-950 underline underline-offset-2"
                >
                  {t("metaRemapCalloutLink")}
                </Link>
              </div>
            ) : null}
            {typeConflicts.length > 0 ? (
              <div>
                <p className="font-semibold">{t("webhookTypeConflictsTitle")}</p>
                <p className="mt-0.5 text-amber-900">
                  {t("webhookTypeConflictsBody").replace(
                    "{columns}",
                    typeConflicts.map((c) => `${c.label} (${c.key})`).join(", ")
                  )}
                </p>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-amber-800 hover:bg-amber-100"
            aria-label={t("noticeDismiss")}
            onClick={dismissWebhookReview}
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ) : null}

      {loading ? (
        <PanelSkeleton />
      ) : (
        <>
          {resolved ? (
            <ClientLeadSheetHero
              resolved={resolved}
              isClientOwned={savedIsClientOwned}
              onChange={() => {
                setError(null)
                setChanging(true)
              }}
            />
          ) : null}

          <ClientLeadSheetTabs
            value={tab}
            onChange={setTab}
            options={[
              { id: "dashboard", label: t("clientLeadSheetTabDashboard") },
              { id: "columns", label: t("clientLeadSheetTabColumns") },
            ]}
          />

          <div key={tab} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
            {tab === "dashboard" ? (
              <ClientDashboardColumns
                slug={slug}
                sheetKey={leadSheet.templateId}
                onError={setError}
              />
            ) : savedIsClientOwned ? (
              <ClientLeadSheetUniquePanel slug={slug} leadSheet={leadSheet} />
            ) : resolved ? (
              <div
                className={cn(
                  adminSectionCardClass,
                  "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                )}
              >
                <p className="text-sm text-muted-foreground">
                  {t("clientLeadSheetSharedColumnsNote").replace("{name}", resolved.template.name)}
                </p>
                <Link
                  href={`/admin/lead-sheets/templates/${resolved.template.id}?client=${encodeURIComponent(slug)}`}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center rounded-md border px-4 text-sm font-medium",
                    adminOutlineButtonClass
                  )}
                >
                  {t("clientLeadSheetEditTemplateColumnsLink")}
                </Link>
              </div>
            ) : null}
          </div>

          {changing ? (
            <ChangeSheetDialog leadSheet={leadSheet} onClose={() => setChanging(false)} />
          ) : null}
        </>
      )}
    </div>
  )
}
