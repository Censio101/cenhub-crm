"use client"

import { AdminClientDeleteSection } from "@/components/admin/AdminClientDeleteSection"
import { useLanguage } from "@/components/i18n/LanguageProvider"

export function AdminClientSettingsPanel() {
  const { t } = useLanguage()

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("clientNavSettings")}</h1>
        <p className="text-sm text-muted-foreground">{t("clientSettingsPageLead")}</p>
      </header>
      <AdminClientDeleteSection />
    </div>
  )
}
