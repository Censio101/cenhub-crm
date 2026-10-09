import { startOfDay } from "date-fns"

import {
  previousPeriod,
  previousYear,
  resolvePreset,
} from "@/lib/performance/date-ranges"
import type {
  ComparisonMode,
  DatePreset,
  DateRange,
} from "@/lib/performance/types"
import { isDashboardComparisonAvailable } from "@/lib/performance/comparison-availability"
import type { DashboardViewState } from "@/lib/performance/url-state"

export function resolveComparisonRange(
  range: DateRange,
  mode: ComparisonMode,
  customRange?: DateRange | null
): DateRange {
  if (mode === "previous_year") return previousYear(range)
  if (mode === "custom" && customRange) return customRange
  return previousPeriod(range)
}

/**
 * All time is stored from 1 Jan 2000. Comparison must start at the first real
 * lead, or the previous window is counted back into the 1970s.
 */
export function comparisonBaseRange(
  range: DateRange,
  preset: DatePreset,
  anchorStart?: Date | null
): DateRange | null {
  if (preset !== "all_time") return range
  if (!anchorStart) return null
  const start = startOfDay(anchorStart)
  if (start.getTime() > range.end.getTime()) return null
  return { start, end: range.end }
}

export function applyPresetChange(
  view: DashboardViewState,
  preset: DatePreset,
  anchorStart?: Date | null
): DashboardViewState {
  const range = resolvePreset(preset)
  const compareOk = isDashboardComparisonAvailable(preset, range, anchorStart)
  const base = comparisonBaseRange(range, preset, anchorStart)
  const comparisonEnabled = compareOk && view.comparisonEnabled
  return {
    ...view,
    preset,
    range,
    comparisonEnabled,
    comparisonRange:
      comparisonEnabled && base
        ? resolveComparisonRange(
            base,
            view.comparisonMode,
            view.comparisonMode === "custom" ? view.comparisonRange : null
          )
        : null,
  }
}

export function applyCustomRangeChange(
  view: DashboardViewState,
  range: DateRange,
  target: "current" | "comparison",
  anchorStart?: Date | null
): DashboardViewState {
  if (target === "current") {
    const compareOk = isDashboardComparisonAvailable("custom", range, anchorStart)
    const comparisonEnabled = compareOk && view.comparisonEnabled
    return {
      ...view,
      preset: "custom",
      range,
      comparisonEnabled,
      comparisonRange: comparisonEnabled
        ? resolveComparisonRange(
            range,
            view.comparisonMode,
            view.comparisonMode === "custom" ? view.comparisonRange : null
          )
        : null,
    }
  }
  if (!isDashboardComparisonAvailable(view.preset, view.range, anchorStart)) {
    return view
  }
  return {
    ...view,
    comparisonEnabled: true,
    comparisonMode: "custom",
    comparisonRange: range,
  }
}

export function applyComparisonChange(
  view: DashboardViewState,
  next: {
    enabled: boolean
    mode: ComparisonMode
    customRange?: DateRange | null
  },
  anchorStart?: Date | null
): DashboardViewState {
  const compareOk = isDashboardComparisonAvailable(view.preset, view.range, anchorStart)
  if (next.enabled && !compareOk) {
    return { ...view, comparisonEnabled: false, comparisonRange: null }
  }
  const base = comparisonBaseRange(view.range, view.preset, anchorStart)
  return {
    ...view,
    comparisonEnabled: next.enabled,
    comparisonMode: next.mode,
    comparisonRange:
      next.enabled && compareOk && base
        ? resolveComparisonRange(base, next.mode, next.customRange ?? view.comparisonRange)
        : null,
  }
}
