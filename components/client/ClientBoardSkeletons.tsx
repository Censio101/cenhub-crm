"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "cn"

/* Every skeleton below mirrors the real section's outer size (paddings, grids, fixed heights)
   so content replaces it without the page jumping. */

function KpiSkeletonCard() {
  return (
    <Card size="sm" className="dashboard-card kpi-card gap-0">
      <div className="flex min-h-[7.25rem] flex-col justify-center px-5 py-5">
        <div className="flex items-start gap-2.5">
          <Skeleton className="mt-0.5 size-5 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <div className="min-h-[2.875rem]">
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="mt-2 h-9 w-32" />
          </div>
        </div>
      </div>
    </Card>
  )
}

function CombinedKpiSkeletonCard() {
  return (
    <Card size="sm" className="dashboard-card kpi-card gap-0">
      <div className="grid min-h-[7.25rem] grid-cols-2 items-center gap-x-3 px-4 py-5 sm:gap-x-4 sm:px-5">
        {[0, 1].map((half) => (
          <div key={half} className="flex items-start gap-2.5">
            <Skeleton className="mt-0.5 size-5 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1">
              <div className="min-h-[2.625rem]">
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="mt-2 h-7 w-20" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function KpiGridSkeleton() {
  const { t } = useLanguage()
  return (
    <section aria-busy="true" aria-label={t("dashboardLoadingOverview")}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 6 }, (_, i) => (
          <KpiSkeletonCard key={i} />
        ))}
        <CombinedKpiSkeletonCard />
        <CombinedKpiSkeletonCard />
      </div>
    </section>
  )
}

export function ChartCardSkeleton() {
  return (
    <Card className="dashboard-card dashboard-chart-card py-0" aria-hidden="true">
      <div className="flex flex-col gap-4 px-6 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-8 w-72 max-w-full rounded-full" />
      </div>
      <div className="px-3 pb-6 sm:px-6">
        <Skeleton className="mt-4 h-[240px] w-full rounded-lg sm:h-[320px] lg:h-[380px]" />
      </div>
    </Card>
  )
}

export function PipelineBarSkeleton() {
  return (
    <section className="dashboard-card gap-0 px-6 py-5" aria-hidden="true">
      <Skeleton className="h-6 w-44" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      <Skeleton className="mt-5 h-2 w-full rounded-full" />
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function TableCardSkeleton({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <section
      className={cn("dashboard-card flex flex-col overflow-hidden", className)}
      aria-hidden="true"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-[#f7f7f5] px-4 py-3 sm:px-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="min-h-0 flex-1 space-y-2 p-4">
        <Skeleton className="h-10 w-full rounded-md" />
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-md" />
        ))}
      </div>
    </section>
  )
}

/** Dashboard body while data loads: KPIs, chart, pipeline and monthly table, in real order. */
export function DashboardMetricsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-8">
      <KpiGridSkeleton />
      <ChartCardSkeleton />
      <PipelineBarSkeleton />
      <TableCardSkeleton rows={6} />
    </div>
  )
}

export function LeadsBoardSkeleton() {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label={t("leadSheetPageTitle")}>
      <PipelineBarSkeleton />
      <TableCardSkeleton
        rows={9}
        className="h-[calc(100dvh-7rem)] min-h-[24rem] flex-none"
      />
    </div>
  )
}

export function CustomersBoardSkeleton() {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label={t("customersTitle")}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="dashboard-card px-5 py-5" aria-hidden="true">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-[1.65rem] w-32" />
          </div>
        ))}
      </div>
      <TableCardSkeleton rows={8} className="min-h-0 flex-1" />
    </div>
  )
}
