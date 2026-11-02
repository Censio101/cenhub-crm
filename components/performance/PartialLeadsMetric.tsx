"use client"

import { ListChecksIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Card } from "@/components/ui/card"
import { formatInteger } from "@/lib/performance/format"

/**
 * One extra metric for clients whose funnel form sends leads step by step: how many leads filled
 * the form only partly. Every other dashboard number counts finished leads only.
 */
export function PartialLeadsMetric({ count }: { count: number }) {
  const { t } = useLanguage()

  return (
    <section aria-label={t("dashboardPartialLeadsLabel")}>
      <Card className="flex flex-row items-center gap-4 px-5 py-4">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"
          aria-hidden="true"
        >
          <ListChecksIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{t("dashboardPartialLeadsLabel")}</p>
          <p className="text-xs text-[var(--text-muted)]">{t("dashboardPartialLeadsHint")}</p>
        </div>
        <p className="text-[2rem] leading-none font-semibold tabular-nums text-foreground">
          {formatInteger(count)}
        </p>
      </Card>
    </section>
  )
}
