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

export function applyPresetChange(
  view: DashboardViewState,
  preset: DatePreset
): DashboardViewState {
  const range = resolvePreset(preset)
  return {
    ...view,
    preset,
    range,
    comparisonRange: view.comparisonEnabled
      ? resolveComparisonRange(range, view.comparisonMode, view.comparisonRange)
      : null,
  }
}

export function applyCustomRangeChange(
  view: DashboardViewState,
  range: DateRange,
  target: "current" | "comparison"
): DashboardViewState {
  if (target === "current") {
    return {
      ...view,
      preset: "custom",
      range,
      comparisonRange: view.comparisonEnabled
        ? resolveComparisonRange(range, view.comparisonMode, view.comparisonRange)
        : null,
    }
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
  }
): DashboardViewState {
  return {
    ...view,
    comparisonEnabled: next.enabled,
    comparisonMode: next.mode,
    comparisonRange: next.enabled
      ? resolveComparisonRange(
          view.range,
          next.mode,
          next.customRange ?? view.comparisonRange
        )
      : null,
  }
}
