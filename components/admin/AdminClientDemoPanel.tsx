"use client"

import { useState } from "react"
import { FlaskConicalIcon } from "lucide-react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import { adminIconBoxClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  clearClientCaches,
  emitClientOrgChanged,
} from "@/lib/data/client-cache"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

export function AdminClientDemoPanel() {
  const { t } = useLanguage()
  const { slug, organization, reload } = useAdminClient()
  const [savingDemo, setSavingDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (!organization) return null

  async function toggleDemoMode() {
    if (!organization) return
    setSavingDemo(true)
    setError(null)
    setNotice(null)
    try {
      const enabling = !organization.demo_mode
      const response = await fetch(`/api/admin/organizations/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoMode: enabling }),
      })
      const data = (await response.json()) as {
        error?: string
        demoSeed?: { leadsCount: number; adMetricsMonths: number }
      }
      if (!response.ok) throw new Error(data.error ?? t("errorUpdateDemo"))

      clearClientCaches()
      emitClientOrgChanged()
      await reload()

      if (enabling && data.demoSeed) {
        setNotice(
          t("demoSeedSuccess", {
            leads: data.demoSeed.leadsCount,
            months: data.demoSeed.adMetricsMonths,
          })
        )
      } else if (!enabling) {
        setNotice(t("demoClearSuccess"))
      }
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : t("errorUpdateDemo")
      )
    } finally {
      setSavingDemo(false)
    }
  }

  return (
    <section className={cn(adminSectionCardClass, "overflow-hidden")}>
      <div className="flex items-center justify-between gap-3 border-b border-[#e8e0d8] bg-[#faf8f6] px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className={adminIconBoxClass("neutral")} aria-hidden="true">
            <FlaskConicalIcon className="size-[18px]" />
          </span>
          <h2 className="text-base font-semibold text-foreground">{t("demoModeTitle")}</h2>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            organization.demo_mode
              ? "bg-amber-50 text-amber-800"
              : "bg-emerald-50 text-emerald-700"
          )}
        >
          {organization.demo_mode ? t("demoActive") : t("liveData")}
        </span>
      </div>
      <div className="grid gap-3 px-5 py-4">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {t("demoModeAdminDescription")}
        </p>
        {error ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-900"
            role="status"
          >
            {notice}
          </p>
        ) : null}
        <Button
          variant="outline"
          className="h-10 w-full border-[#d3c3b2] bg-white"
          disabled={savingDemo}
          onClick={() => {
            void toggleDemoMode()
          }}
        >
          {savingDemo
            ? t("saving")
            : organization.demo_mode
              ? t("disableDemo")
              : t("enableDemo")}
        </Button>
      </div>
    </section>
  )
}
