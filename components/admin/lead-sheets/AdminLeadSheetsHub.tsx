"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { AdminPageIntro } from "@/components/admin/AdminPageIntro"
import { AdminLeadSheetTemplatesPanel } from "@/components/admin/lead-sheets/AdminLeadSheetTemplatesPanel"
import { LeadSheetsSectionNav } from "@/components/admin/lead-sheets/LeadSheetsSectionNav"
import { AdminCardSkeleton } from "@/components/admin/AdminListSkeleton"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { prefetchLeadSheetsHubCategories } from "@/hooks/useLeadSheetsHubCategories"

function HubContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("tab") === "categories") {
      router.replace("/admin/business-categories")
    }
  }, [router, searchParams])

  useEffect(() => {
    void prefetchLeadSheetsHubCategories()
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <AdminPageIntro title={t("leadSheetsHubTitle")} description={t("leadSheetsHubIntro")} />
      <LeadSheetsSectionNav />
      <AdminLeadSheetTemplatesPanel />
    </div>
  )
}

function HubSuspenseFallback() {
  const { t } = useLanguage()
  return (
    <>
      <p className="sr-only">{t("leadSheetsLoading")}</p>
      <AdminCardSkeleton rows={5} />
    </>
  )
}

export function AdminLeadSheetsHub() {
  return (
    <Suspense fallback={<HubSuspenseFallback />}>
      <HubContent />
    </Suspense>
  )
}
