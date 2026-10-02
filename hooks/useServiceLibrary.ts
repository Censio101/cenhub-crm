"use client"

import { useCallback, useState } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import type { Service } from "@/lib/services/types"

export type LibraryService = Service & { categoryIds: string[]; clientCount: number }

/** The global service library (admin). `create` adds one and returns it, or null on failure. */
export function useServiceLibrary(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false
  const { t } = useLanguage()
  const [services, setServices] = useState<LibraryService[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!enabled) return
    try {
      const res = await fetch("/api/admin/services")
      if (!res.ok) throw new Error("load")
      const data = (await res.json()) as { services: LibraryService[] }
      setServices(data.services ?? [])
      setError(null)
    } catch {
      setError(t("servicesLoadError"))
    } finally {
      setLoading(false)
    }
  }, [enabled, t])

  useAsyncEffect(() => {
    void load()
  }, [load])

  const create = useCallback(
    async (nameDa: string, nameEn?: string): Promise<LibraryService | null> => {
      try {
        const res = await fetch("/api/admin/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nameDa, nameEn }),
        })
        if (!res.ok) return null
        const { service } = (await res.json()) as { service: Service }
        const created: LibraryService = { ...service, categoryIds: [], clientCount: 0 }
        setServices((current) => [...current, created])
        return created
      } catch {
        return null
      }
    },
    []
  )

  return { services, setServices, loading, error, setError, reload: load, create }
}
