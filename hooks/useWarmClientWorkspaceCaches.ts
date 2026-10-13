"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { NO_ACTIVE_ORGANIZATION_ERROR } from "@/lib/auth/active-organization"
import {
  getAdSpendCache,
  hasCustomersCache,
  hasLeadsCache,
  setAdSpendCache,
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

type AdSpendPayload = {
  adSpendByMonth?: Record<string, number>
  source?: "synced" | "demo" | "pending"
  metaEnabled?: boolean
  metaLastSyncedAt?: string | null
}

/** Prefetch customers + dashboard ad spend in the background on client core routes. */
export function useWarmClientWorkspaceCaches() {
  const pathname = usePathname() ?? ""
  const { organization } = useActiveOrganization()
  const activeSlug = organization?.slug ?? null
  const customersInflight = useRef(false)
  const adSpendInflight = useRef(false)

  useEffect(() => {
    if (!isClientCorePath(pathname)) return
    if (!hasLeadsCache(activeSlug)) return

    if (!hasCustomersCache(activeSlug) && !customersInflight.current) {
      customersInflight.current = true
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
          customersInflight.current = false
        }
      })()
    }

    if (getAdSpendCache(activeSlug) === null && !adSpendInflight.current) {
      adSpendInflight.current = true
      void (async () => {
        try {
          const result = await fetchJsonDeduped<AdSpendPayload>("/api/metrics/ad-spend")
          const data = result.data
          if (!result.ok || !data) return
          setAdSpendCache(data.adSpendByMonth ?? {}, activeSlug)
        } finally {
          adSpendInflight.current = false
        }
      })()
    }
  }, [pathname, activeSlug])
}
