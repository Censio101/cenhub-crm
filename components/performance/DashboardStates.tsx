"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { DashboardMetricsSkeleton } from "@/components/client/ClientBoardSkeletons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Session restore: welcome area placeholder + KPI/chart skeleton (matches live dashboard layout). */
export function DashboardSkeleton() {
  const { t } = useLanguage()
  return (
    <div className="flex w-full flex-col gap-8" aria-busy="true" aria-label={t("dashboardLoadingOverview")}>
      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <Skeleton className="h-10 w-72 max-w-full sm:h-11" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-full max-w-md rounded-[15px] lg:w-80" />
      </header>
      <DashboardMetricsSkeleton />
    </div>
  )
}

export function DashboardEmptyState() {
  const { t } = useLanguage()
  return (
    <Card className="dashboard-card px-5 py-8 text-center">
      <p className="text-sm font-medium text-[var(--text-primary)]">
        {t("dashboardEmptyTitle")}
      </p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {t("dashboardEmptyBody")}
      </p>
    </Card>
  )
}

export function DashboardErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage()
  return (
    <Card className="dashboard-card px-5 py-8 text-center">
      <p className="text-sm font-medium text-[var(--text-primary)]">
        {t("dashboardErrorTitle")}
      </p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {t("dashboardErrorBody")}
      </p>
      <Button className="mt-4" variant="outline" onClick={onRetry}>
        {t("dashboardRetry")}
      </Button>
    </Card>
  )
}
