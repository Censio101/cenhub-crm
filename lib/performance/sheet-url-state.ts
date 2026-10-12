import {
  endOfDay,
  isSameDay,
  startOfDay,
} from "date-fns"

import { DATE_PRESETS, parseIsoDate, resolvePreset, toIsoDate } from "./date-ranges"
import type { DatePreset, DateRange } from "./types"

export type SheetViewState = {
  preset: DatePreset
  range: DateRange
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

/** Date filter for lead/customer sheets only — not shared with the performance dashboard. */
export function parseSheetParams(
  params: URLSearchParams,
  now: Date = new Date()
): SheetViewState {
  const presetParam = params.get("preset") as DatePreset | null
  const from = parseIsoDate(params.get("from"))
  const to = parseIsoDate(params.get("to"))

  let preset: DatePreset = "all_time"
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
    range = resolvePreset("all_time", now)
  }

  return { preset, range }
}

export function sheetStateToParams(state: SheetViewState): string {
  const params = new URLSearchParams()
  params.set("preset", state.preset)
  params.set("from", toIsoDate(state.range.start))
  params.set("to", toIsoDate(state.range.end))
  return params.toString()
}
