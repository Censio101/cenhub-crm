"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  const { t } = useLanguage()
  return (
    <div className="space-y-6" aria-busy="true" aria-label={t("dashboardLoadingOverview")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Card key={index} className="dashboard-card gap-3 py-4">
            <Skeleton className="mx-4 h-3 w-20" />
            <Skeleton className="mx-4 h-8 w-28" />
            <Skeleton className="mx-4 h-4 w-24" />
          </Card>
        ))}
      </div>
      <Card className="dashboard-card p-5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-3 h-[240px] w-full sm:h-[320px]" />
      </Card>
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

export function PartialDataNotice() {
  const { t } = useLanguage()
  return (
    <p className="text-xs text-[var(--text-muted)]">
      {t("dashboardPartialData")}
    </p>
  )
}
