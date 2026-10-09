"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useTransition } from "react"

import { isDashboardComparisonAvailable } from "@/lib/performance/comparison-availability"
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
import { useKeyedState } from "@/lib/react/use-keyed-state"
import type { CustomerSegmentId } from "@/lib/performance/customer-segments"
import type { FunnelId } from "@/lib/performance/funnels"
import type { ServiceId } from "@/lib/performance/services"

export function useDashboardViewState(basePath: string, comparisonAnchorStart?: Date | null) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const queryKey = searchParams.toString()
  // The view follows the URL; `replaceState` also sets it right away for instant feedback.
  const [view, setView] = useKeyedState(
    parseDashboardParams(new URLSearchParams(queryKey)),
    queryKey
  )

  const replaceState = useCallback(
    (next: DashboardViewState) => {
      setView(next)
      const query = dashboardStateToParams(next)
      const path = query ? `${basePath}?${query}` : basePath
      startTransition(() => {
        router.replace(path, { scroll: false })
      })
    },
    [basePath, queryKey, router, setView]
  )

  const onPresetChange = useCallback(
    (preset: DatePreset) => replaceState(applyPresetChange(view, preset, comparisonAnchorStart)),
    [comparisonAnchorStart, replaceState, view]
  )

  const onCustomRange = useCallback(
    (range: DateRange, target: "current" | "comparison") =>
      replaceState(applyCustomRangeChange(view, range, target, comparisonAnchorStart)),
    [comparisonAnchorStart, replaceState, view]
  )

  const onComparisonChange = useCallback(
    (next: { enabled: boolean; mode: ComparisonMode; customRange?: DateRange | null }) =>
      replaceState(applyComparisonChange(view, next, comparisonAnchorStart)),
    [comparisonAnchorStart, replaceState, view]
  )

  useEffect(() => {
    if (!view.comparisonEnabled) return
    if (
      isDashboardComparisonAvailable(view.preset, view.range, comparisonAnchorStart)
    ) {
      return
    }
    replaceState({ ...view, comparisonEnabled: false, comparisonRange: null })
  }, [comparisonAnchorStart, replaceState, view])

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
