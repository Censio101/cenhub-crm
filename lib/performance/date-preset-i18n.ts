import type { MessageKey } from "@/lib/i18n"
import type { DatePreset } from "@/lib/performance/types"

export const DATE_PRESET_MESSAGE_KEYS: Record<DatePreset, MessageKey> = {
  this_month: "datePresetThisMonth",
  last_month: "datePresetLastMonth",
  last_30_days: "datePresetLast30Days",
  last_3_months: "datePresetLast3Months",
  last_6_months: "datePresetLast6Months",
  ytd: "datePresetYtd",
  last_12_months: "datePresetLast12Months",
  custom: "datePresetCustom",
}

export const COMPARISON_MODE_MESSAGE_KEYS = {
  previous_period: "comparePreviousPeriod",
  previous_year: "comparePreviousYear",
  custom: "compareCustom",
} as const
