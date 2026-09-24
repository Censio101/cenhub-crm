"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState, useTransition } from "react"

import {
  applyComparisonChange,
  applyCustomRangeChange,
  applyPresetChange,
} from "@/lib/performance/dashboard-view-mutations"
import type { ComparisonMode, DatePreset, DateRange, MetricId } from "@/lib/performance/types"
import {
  dashboardStateToParams,
  parseDashboardParams,
  type DashboardViewState,
} from "@/lib/performance/url-state"
import type { CustomerSegmentId } from "@/lib/performance/customer-segments"
import type { FunnelId } from "@/lib/performance/funnels"
import type { ServiceId } from "@/lib/performance/services"

export function useDashboardViewState(basePath: string) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [view, setView] = useState(() => parseDashboardParams(searchParams))
  const queryKey = searchParams.toString()

  useEffect(() => {
    setView(parseDashboardParams(new URLSearchParams(queryKey)))
  }, [queryKey])

  const replaceState = useCallback(
    (next: DashboardViewState) => {
      setView(next)
      const query = dashboardStateToParams(next)
      const path = query ? `${basePath}?${query}` : basePath
      startTransition(() => {
        router.replace(path, { scroll: false })
      })
    },
    [basePath, router]
  )

  const onPresetChange = useCallback(
    (preset: DatePreset) => replaceState(applyPresetChange(view, preset)),
    [replaceState, view]
  )

  const onCustomRange = useCallback(
    (range: DateRange, target: "current" | "comparison") =>
      replaceState(applyCustomRangeChange(view, range, target)),
    [replaceState, view]
  )

  const onComparisonChange = useCallback(
    (next: {
      enabled: boolean
      mode: ComparisonMode
      customRange?: DateRange | null
    }) => replaceState(applyComparisonChange(view, next)),
    [replaceState, view]
  )

  const onServiceChange = useCallback(
    (service: ServiceId | null) => replaceState({ ...view, service }),
    [replaceState, view]
  )

  const onFunnelChange = useCallback(
    (funnel: FunnelId | null) => replaceState({ ...view, funnel }),
    [replaceState, view]
  )

  const onSegmentChange = useCallback(
    (segment: CustomerSegmentId | null) => replaceState({ ...view, segment }),
    [replaceState, view]
  )

  const onMetricChange = useCallback(
    (metric: MetricId) => replaceState({ ...view, metric }),
    [replaceState, view]
  )

  return {
    view,
    pending,
    replaceState,
    onPresetChange,
    onCustomRange,
    onComparisonChange,
    onServiceChange,
    onFunnelChange,
    onSegmentChange,
    onMetricChange,
  }
}
