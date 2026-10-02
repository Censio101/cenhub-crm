"use client"

import { useCallback, useState } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  getLeadSheetsCategoriesCache,
  setLeadSheetsCategoriesCache,
} from "@/lib/data/lead-sheets-hub-cache"
import type { BusinessCategory } from "@/lib/lead-sheet/types"
import { useAsyncEffect } from "@/lib/react/use-async-effect"

export function useLeadSheetsHubCategories(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false
  const { t } = useLanguage()
  const [categories, setCategories] = useState<BusinessCategory[]>(
    () => getLeadSheetsCategoriesCache() ?? []
  )
  const [loading, setLoading] = useState(() => enabled && getLeadSheetsCategoriesCache() === null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (loadOptions?: { silent?: boolean }) => {
      if (!enabled) return
      const hasCache = getLeadSheetsCategoriesCache() !== null
      if (!loadOptions?.silent && !hasCache) {
        setLoading(true)
        setError(null)
      }
      try {
        const res = await fetch("/api/admin/business-categories")
        if (!res.ok) throw new Error("load")
        const data = (await res.json()) as { categories: BusinessCategory[] }
        const next = data.categories ?? []
        setLeadSheetsCategoriesCache(next)
        setCategories(next)
      } catch {
        if (!loadOptions?.silent) setError(t("leadSheetsLoadError"))
      } finally {
        if (!loadOptions?.silent) setLoading(false)
      }
    },
    [enabled, t]
  )

  useAsyncEffect(() => {
    if (!enabled) return
    const cached = getLeadSheetsCategoriesCache()
    void load({ silent: cached !== null })
  }, [enabled, load])

  const setCategoriesLocal = useCallback((next: BusinessCategory[]) => {
    setLeadSheetsCategoriesCache(next)
    setCategories(next)
  }, [])

  return { categories, setCategories: setCategoriesLocal, loading, error, setError, reload: load }
}

/** Warm cache when the hub mounts so the Categories tab feels instant. */
export async function prefetchLeadSheetsHubCategories(): Promise<void> {
  if (getLeadSheetsCategoriesCache() !== null) return
  try {
    const res = await fetch("/api/admin/business-categories")
    if (!res.ok) return
    const data = (await res.json()) as { categories: BusinessCategory[] }
    setLeadSheetsCategoriesCache(data.categories ?? [])
  } catch {
    /* ignore — panels show their own errors */
  }
}
