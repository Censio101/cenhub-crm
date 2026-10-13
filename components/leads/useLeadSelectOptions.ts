"use client"

import { useMemo } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { leadSegmentLabelKey, leadStatusLabelKey } from "@/lib/lead-sheet/lead-labels"
import { LEAD_SEGMENTS, LEAD_STATUSES } from "@/lib/leads"

/** Translated labels for lead sheet selects (status, segment). */
export function useLeadSelectOptions() {
  const { t } = useLanguage()

  return useMemo(
    () => ({
      statuses: LEAD_STATUSES.map((item) => ({
        id: item.id,
        label: t(leadStatusLabelKey(item.id)),
      })),
      segments: LEAD_SEGMENTS.map((item) => ({
        id: item.id,
        label: t(leadSegmentLabelKey(item.id)),
      })),
    }),
    [t]
  )
}
