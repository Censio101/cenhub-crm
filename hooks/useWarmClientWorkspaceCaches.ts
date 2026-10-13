"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { NO_ACTIVE_ORGANIZATION_ERROR } from "@/lib/auth/active-organization"
import {
  hasCustomersCache,
  hasLeadsCache,
  setCustomersCache,
} from "@/lib/data/client-cache"
import { fetchJsonDeduped } from "@/lib/data/in-flight"
import { isClientCorePath } from "@/lib/layout/client-navigation-zones"
import type { Customer } from "@/lib/customers"

type CustomersResponse = {
  customers: Customer[]
  source: "mock" | "supabase"
  organization?: {
    id: string
    slug: string
    name: string
    demoMode: boolean
  }
  error?: string
}

/** Prefetch customers in the background so Kunder opens without a cold skeleton. */
export function useWarmClientWorkspaceCaches() {
  const pathname = usePathname() ?? ""
  const { organization } = useActiveOrganization()
  const activeSlug = organization?.slug ?? null
  const inflight = useRef(false)

  useEffect(() => {
    if (!isClientCorePath(pathname)) return
    if (!hasLeadsCache(activeSlug)) return
    if (hasCustomersCache(activeSlug)) return
    if (inflight.current) return

    inflight.current = true
    void (async () => {
      try {
        const result = await fetchJsonDeduped<CustomersResponse>("/api/customers")
        const data = result.data
        if (!result.ok || !data || data.error === NO_ACTIVE_ORGANIZATION_ERROR) return
        setCustomersCache({
          customers: data.customers,
          source: data.source,
          organizationName: data.organization?.name ?? null,
          organizationSlug: data.organization?.slug ?? null,
        })
      } finally {
        inflight.current = false
      }
    })()
  }, [pathname, activeSlug])
}
