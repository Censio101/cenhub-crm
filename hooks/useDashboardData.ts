"use client"

import { useCallback, useEffect, useState } from "react"

import { NO_ACTIVE_ORGANIZATION_ERROR } from "@/lib/auth/active-organization"
import {
  CLIENT_ORG_CHANGED_EVENT,
  getAdSpendCache,
  getLeadsCache,
  hasLeadsCache,
  setAdSpendCache,
  setLeadsCache,
} from "@/lib/data/client-cache"
import { demoAdSpendByMonth } from "@/lib/performance/demo-ad-spend"
import { MOCK_LEADS, type Lead } from "@/lib/leads"

type DashboardDataState = {
  leads: Lead[]
  adSpendByMonth: Record<string, number>
  loading: boolean
  error: string | null
  needsClientSelection: boolean
  source: "mock" | "supabase"
}

async function shouldUseMockFallback(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/me", { cache: "no-store" })
    if (!response.ok) return false
    const data = (await response.json()) as {
      isDemoFallback?: boolean
      userId?: string | null
    }
    return Boolean(data.isDemoFallback && !data.userId)
  } catch {
    return false
  }
}

export function useDashboardData(): DashboardDataState {
  const cachedLeads = getLeadsCache()
  const cachedAdSpend = getAdSpendCache()
  const [leads, setLeads] = useState<Lead[]>(() => cachedLeads?.leads ?? [])
  const [adSpendByMonth, setAdSpendByMonth] = useState<Record<string, number>>(
    () => cachedAdSpend ?? demoAdSpendByMonth()
  )
  const [loading, setLoading] = useState(() => !hasLeadsCache())
  const [error, setError] = useState<string | null>(null)
  const [needsClientSelection, setNeedsClientSelection] = useState(false)
  const [source, setSource] = useState<"mock" | "supabase">(
    () => cachedLeads?.source ?? "mock"
  )

  const load = useCallback(async () => {
    const showLoading = !hasLeadsCache()
    if (showLoading) setLoading(true)
    setError(null)
    setNeedsClientSelection(false)

    try {
      const [leadsResponse, adSpendResponse] = await Promise.all([
        fetch("/api/leads", { cache: "no-store" }),
        fetch("/api/metrics/ad-spend", { cache: "no-store" }),
      ])

      const leadsPayload = (await leadsResponse.json()) as {
        leads: Lead[]
        source?: "mock" | "supabase"
        organization?: { slug?: string }
        error?: string
        message?: string
      }

      if (!leadsResponse.ok) {
        if (leadsPayload.error === NO_ACTIVE_ORGANIZATION_ERROR) {
          setLeads([])
          setAdSpendByMonth({})
          setSource("supabase")
          setNeedsClientSelection(true)
          setError(
            leadsPayload.message ?? "Vælg en klient for at se deres dashboard."
          )
          setLeadsCache({ leads: [], source: "supabase" })
          setAdSpendCache({})
          return
        }

        if (await shouldUseMockFallback()) {
          setLeads(MOCK_LEADS)
          setAdSpendByMonth(demoAdSpendByMonth())
          setSource("mock")
          setLeadsCache({ leads: MOCK_LEADS, source: "mock" })
          setAdSpendCache(demoAdSpendByMonth())
          setError("Viser demo-data — database ikke tilgængelig")
          return
        }

        throw new Error(leadsPayload.message ?? "Kunne ikke hente leads")
      }

      let nextAdSpend: Record<string, number> = {}
      if (adSpendResponse.ok) {
        const adSpendPayload = (await adSpendResponse.json()) as {
          adSpendByMonth: Record<string, number>
        }
        nextAdSpend = adSpendPayload.adSpendByMonth ?? {}
      }

      const nextSource =
        leadsPayload.source === "supabase" ? "supabase" : "mock"

      setLeads(leadsPayload.leads)
      setAdSpendByMonth(nextAdSpend)
      setSource(nextSource)
      setLeadsCache({
        leads: leadsPayload.leads,
        source: nextSource,
        organizationSlug: leadsPayload.organization?.slug ?? null,
      })
      setAdSpendCache(nextAdSpend, leadsPayload.organization?.slug ?? null)
    } catch (loadError) {
      console.error(loadError)
      if (await shouldUseMockFallback()) {
        setLeads(MOCK_LEADS)
        setAdSpendByMonth(demoAdSpendByMonth())
        setSource("mock")
        setLeadsCache({ leads: MOCK_LEADS, source: "mock" })
        setAdSpendCache(demoAdSpendByMonth())
        setError("Viser demo-data — database ikke tilgængelig")
      } else {
        setLeads([])
        setAdSpendByMonth({})
        setSource("supabase")
        setError(
          loadError instanceof Error ? loadError.message : "Kunne ikke hente data"
        )
      }
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onOrgChanged = () => {
      void load()
    }
    window.addEventListener(CLIENT_ORG_CHANGED_EVENT, onOrgChanged)
    return () => window.removeEventListener(CLIENT_ORG_CHANGED_EVENT, onOrgChanged)
  }, [load])

  return { leads, adSpendByMonth, loading, error, needsClientSelection, source }
}
