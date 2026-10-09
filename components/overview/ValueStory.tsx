import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Card } from "@/components/ui/card"
import { buildValueStory } from "@/lib/performance/insights"
import type { PerformanceDashboardData } from "@/lib/performance/types"

export function ValueStory({
  data,
  comparisonEnabled,
}: {
  data: PerformanceDashboardData
  comparisonEnabled: boolean
}) {
  const { t } = useLanguage()
  if (data.status === "empty") return null

  const comparisonTotals = comparisonEnabled ? (data.comparison?.totals ?? null) : null
  const story = buildValueStory(data.current.totals, comparisonTotals)

  return (
    <Card className="dashboard-card gap-3 px-6 py-5">
      <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
        Det I har fået
      </h2>
      <p className="max-w-3xl text-base leading-relaxed text-[var(--text-primary)]">
        I brugte <strong className="font-semibold">{story.spend}</strong> på
        annoncer. I fik <strong className="font-semibold">{story.leads}</strong>{" "}
        leads og{" "}
        <strong className="font-semibold">{story.customers}</strong> lukkede
        kunder. Det gav{" "}
        <strong className="font-semibold">{story.revenue}</strong> i omsætning og{" "}
        <strong className="font-semibold">{story.profit}</strong> på bundlinjen.
      </p>
      {story.roasValue != null ? (
        <p className="text-base font-medium text-[var(--text-primary)]">
          For hver 1 kr. i annoncer kom der {story.roas} kr. tilbage.
        </p>
      ) : null}
      {comparisonEnabled && !data.comparison ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("kpiNoCompareData")}</p>
      ) : null}
      {story.comparisonLines.length > 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">
          {story.comparisonLines.join(" · ")}
        </p>
      ) : null}
    </Card>
  )
}
