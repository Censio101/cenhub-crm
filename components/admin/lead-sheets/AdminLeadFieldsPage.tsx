"use client"

import { AdminPageIntro } from "@/components/admin/AdminPageIntro"
import { AdminLeadFieldsPanel } from "@/components/admin/lead-sheets/AdminLeadFieldsPanel"
import { LeadSheetsSectionNav } from "@/components/admin/lead-sheets/LeadSheetsSectionNav"
import { useLanguage } from "@/components/i18n/LanguageProvider"

export function AdminLeadFieldsPage() {
  const { t } = useLanguage()
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <AdminPageIntro title={t("leadSheetsHubTitle")} />
      <LeadSheetsSectionNav />
      <AdminLeadFieldsPanel />
    </div>
  )
}
