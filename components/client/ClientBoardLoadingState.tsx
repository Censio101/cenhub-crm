"use client"

import {
  ChartCardSkeleton,
  KpiGridSkeleton,
  PipelineBarSkeleton,
  TableCardSkeleton,
} from "@/components/client/ClientBoardSkeletons"
import { cn } from "cn"

type Variant = "dashboard" | "leads" | "customers"

const variantConfig: Record<
  Variant,
  { showPipeline: boolean; showStats: boolean; tableRows: number; tableClass?: string }
> = {
  dashboard: { showPipeline: false, showStats: false, tableRows: 0 },
  leads: {
    showPipeline: true,
    showStats: false,
    tableRows: 9,
    tableClass: "h-[calc(100dvh-7rem)] min-h-[24rem] flex-none",
  },
  customers: { showPipeline: false, showStats: true, tableRows: 8 },
}

/**
 * Cold data load: layout skeleton only. Session/bootstrap uses ClientPageBootstrapSpinner (ring).
 */
export function ClientBoardLoadingState({
  variant,
  className,
}: {
  variant: Variant
  className?: string
}) {
  const config = variantConfig[variant]

  if (variant === "dashboard") {
    return (
      <div className={cn("flex w-full flex-col gap-8", className)}>
        <KpiGridSkeleton />
        <ChartCardSkeleton />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {config.showPipeline ? <PipelineBarSkeleton /> : null}
      {config.showStats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="dashboard-card h-[5.5rem] bg-[#f7f7f5]" aria-hidden />
          ))}
        </div>
      ) : null}
      <TableCardSkeleton rows={config.tableRows} className={config.tableClass} />
    </div>
  )
}
