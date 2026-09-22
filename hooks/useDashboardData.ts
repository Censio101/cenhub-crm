"use client"

import { useCallback, useEffect, useState } from "react"

import {
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
  source: "mock" | "supabase"
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
  const [source, setSource] = useState<"mock" | "supabase">(
    () => cachedLeads?.source ?? "mock"
  )

  const load = useCallback(async () => {
    const showLoading = !hasLeadsCache()
    if (showLoading) setLoading(true)
    setError(null)

    try {
      const [leadsResponse, adSpendResponse] = await Promise.all([
        fetch("/api/leads", { cache: "no-store" }),
        fetch("/api/metrics/ad-spend", { cache: "no-store" }),
      ])

      if (!leadsResponse.ok) {
        throw new Error("Kunne ikke hente leads")
      }

      const leadsPayload = (await leadsResponse.json()) as {
        leads: Lead[]
        source?: "mock" | "supabase"
      }

      let nextAdSpend = demoAdSpendByMonth()
      if (adSpendResponse.ok) {
        const adSpendPayload = (await adSpendResponse.json()) as {
          adSpendByMonth: Record<string, number>
        }
        nextAdSpend = adSpendPayload.adSpendByMonth ?? nextAdSpend
      }

      const nextSource =
        leadsPayload.source === "supabase" ? "supabase" : "mock"

      setLeads(leadsPayload.leads)
      setAdSpendByMonth(nextAdSpend)
      setSource(nextSource)
      setLeadsCache({ leads: leadsPayload.leads, source: nextSource })
      setAdSpendCache(nextAdSpend)
    } catch (loadError) {
      console.error(loadError)
      setLeads(MOCK_LEADS)
      setAdSpendByMonth(demoAdSpendByMonth())
      setSource("mock")
      setLeadsCache({ leads: MOCK_LEADS, source: "mock" })
      setAdSpendCache(demoAdSpendByMonth())
      setError("Viser demo-data — database ikke tilgængelig")
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { leads, adSpendByMonth, loading, error, source }
}
