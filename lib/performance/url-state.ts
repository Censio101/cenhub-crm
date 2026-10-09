import { da } from "date-fns/locale"
import {
  endOfDay,
  isSameDay,
  startOfDay,
} from "date-fns"

import { isDashboardComparisonAvailable } from "./comparison-availability"
import { DATE_PRESETS, parseIsoDate, previousPeriod, previousYear, resolvePreset, toIsoDate } from "./date-ranges"
import { isCustomerSegmentId } from "./customer-segments"
import type { CustomerSegmentId } from "./customer-segments"
import { isFunnelId } from "./funnels"
import type { FunnelId } from "./funnels"
import { isMetricId } from "./metrics"
import type { ServiceId } from "./services"
import type {
  ComparisonMode,
  DatePreset,
  DateRange,
  MetricId,
} from "./types"

/** Service slugs are lower-case words with hyphens (see the services table check). */
const SERVICE_SLUG_RE = /^[a-z0-9-]{2,64}$/

export type DashboardViewState = {
  preset: DatePreset
  range: DateRange
  comparisonEnabled: boolean
  comparisonMode: ComparisonMode
  comparisonRange: DateRange | null
  metric: MetricId
  service: ServiceId | null
  funnel: FunnelId | null
  segment: CustomerSegmentId | null
}

function detectPreset(range: DateRange, now: Date): DatePreset {
  for (const preset of DATE_PRESETS) {
    if (preset.id === "custom") continue
    const resolved = resolvePreset(preset.id, now)
    if (
      isSameDay(resolved.start, range.start) &&
      isSameDay(resolved.end, range.end)
    ) {
      return preset.id
    }
  }
  return "custom"
}

export function parseDashboardParams(
  params: URLSearchParams,
  now: Date = new Date()
): DashboardViewState {
  const presetParam = params.get("preset") as DatePreset | null
  const from = parseIsoDate(params.get("from"))
  const to = parseIsoDate(params.get("to"))

  let preset: DatePreset = "ytd"
  let range: DateRange

  if (from && to) {
    range = { start: startOfDay(from), end: endOfDay(to) }
    preset =
      presetParam && (presetParam === "all_time" || DATE_PRESETS.some((item) => item.id === presetParam))
        ? presetParam
        : detectPreset(range, now)
  } else if (presetParam === "all_time" || (presetParam && DATE_PRESETS.some((item) => item.id === presetParam))) {
    preset = presetParam
    range = resolvePreset(preset, now)
  } else {
    range = resolvePreset("ytd", now)
  }

  const metricParam = params.get("metric")
  const metric: MetricId =
    metricParam && isMetricId(metricParam) ? metricParam : "revenue"

  const serviceParam = params.get("service")
  const service: ServiceId | null =
    serviceParam && SERVICE_SLUG_RE.test(serviceParam) ? serviceParam : null

  const funnelParam = params.get("funnel")
  const funnel: FunnelId | null =
    funnelParam && isFunnelId(funnelParam) ? funnelParam : null

  const segmentParam = params.get("segment")
  const segment: CustomerSegmentId | null =
    segmentParam && isCustomerSegmentId(segmentParam) ? segmentParam : null

  const compareParam = params.get("compare")
  const comparisonEnabled =
    compareParam === "1" ||
    compareParam === "previous" ||
    compareParam === "year" ||
    compareParam === "custom"

  let comparisonMode: ComparisonMode = "previous_period"
  if (compareParam === "year") comparisonMode = "previous_year"
  if (compareParam === "custom") comparisonMode = "custom"

  const compareFrom = parseIsoDate(params.get("compareFrom"))
  const compareTo = parseIsoDate(params.get("compareTo"))
  const customComparison =
    compareFrom && compareTo
      ? { start: startOfDay(compareFrom), end: endOfDay(compareTo) }
      : null

  let comparisonRange: DateRange | null = null
  if (comparisonEnabled) {
    if (comparisonMode === "custom" && customComparison) {
      comparisonRange = customComparison
    } else if (preset === "all_time") {
      comparisonRange =
        customComparison && customComparison.start.getFullYear() >= 2000
          ? customComparison
          : null
    } else if (comparisonMode === "previous_year") {
      comparisonRange = previousYear(range)
    } else {
      comparisonRange = previousPeriod(range)
      comparisonMode = "previous_period"
    }
  }

  let comparisonEnabledOut = comparisonEnabled
  let comparisonRangeOut = comparisonRange
  if (!isDashboardComparisonAvailable(preset, range, null, now)) {
    comparisonEnabledOut = false
    comparisonRangeOut = null
  }

  return {
    preset,
    range,
    comparisonEnabled: comparisonEnabledOut,
    comparisonMode,
    comparisonRange: comparisonRangeOut,
    metric,
    service,
    funnel,
    segment,
  }
}

export function dashboardStateToParams(state: DashboardViewState): string {
  const params = new URLSearchParams()
  params.set("preset", state.preset)
  params.set("from", toIsoDate(state.range.start))
  params.set("to", toIsoDate(state.range.end))
  params.set("metric", state.metric)
  if (state.service) params.set("service", state.service)
  if (state.funnel) params.set("funnel", state.funnel)
  if (state.segment) params.set("segment", state.segment)

  if (
    state.comparisonEnabled &&
    isDashboardComparisonAvailable(state.preset, state.range, null)
  ) {
    const compareValue =
      state.comparisonMode === "previous_year"
        ? "year"
        : state.comparisonMode === "custom"
          ? "custom"
          : "previous"
    params.set("compare", compareValue)
    if (state.comparisonRange) {
      params.set("compareFrom", toIsoDate(state.comparisonRange.start))
      params.set("compareTo", toIsoDate(state.comparisonRange.end))
    }
  }

  return params.toString()
}

export { da }
