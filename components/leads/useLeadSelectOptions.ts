"use client"

import { useMemo } from "react"

import { LEAD_SEGMENTS, LEAD_STATUSES } from "@/lib/leads"

/** Stored labels for lead rows. These stay the same in Danish and English. */
export function useLeadSelectOptions() {
  return useMemo(
    () => ({
      statuses: LEAD_STATUSES.map((item) => ({
        id: item.id,
        label: item.label,
      })),
      segments: LEAD_SEGMENTS.map((item) => ({
        id: item.id,
        label: item.label,
      })),
    }),
    []
  )
}
