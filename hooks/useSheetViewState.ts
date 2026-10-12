"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"

import { resolvePreset } from "@/lib/performance/date-ranges"
import {
  parseSheetParams,
  sheetStateToParams,
  type SheetViewState,
} from "@/lib/performance/sheet-url-state"
import type { DatePreset, DateRange } from "@/lib/performance/types"
import { useKeyedState } from "@/lib/react/use-keyed-state"

export function useSheetViewState(basePath: string) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const queryKey = searchParams.toString()
  const [view, setView] = useKeyedState(parseSheetParams(new URLSearchParams(queryKey)), queryKey)

  const replaceState = useCallback(
    (next: SheetViewState) => {
      setView(next)
      const query = sheetStateToParams(next)
      const path = query ? `${basePath}?${query}` : basePath
      startTransition(() => {
        router.replace(path, { scroll: false })
      })
    },
    [basePath, router, setView]
  )

  const onPresetChange = useCallback(
    (preset: DatePreset) => replaceState({ preset, range: resolvePreset(preset) }),
    [replaceState]
  )

  const onCustomRange = useCallback(
    (range: DateRange) => replaceState({ preset: "custom", range }),
    [replaceState]
  )

  return { view, pending, onPresetChange, onCustomRange }
}
