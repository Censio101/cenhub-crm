"use client"

import { useCallback, useEffect, useState } from "react"

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
  const [leads, setLeads] = useState<Lead[]>([])
  const [adSpendByMonth, setAdSpendByMonth] = useState<Record<string, number>>(
    demoAdSpendByMonth()
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<"mock" | "supabase">("mock")

  const load = useCallback(async () => {
    setLoading(true)
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

      setLeads(leadsPayload.leads)
      setAdSpendByMonth(nextAdSpend)
      setSource(leadsPayload.source === "supabase" ? "supabase" : "mock")
    } catch (loadError) {
      console.error(loadError)
      setLeads(MOCK_LEADS)
      setAdSpendByMonth(demoAdSpendByMonth())
      setSource("mock")
      setError("Viser demo-data — database ikke tilgængelig")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { leads, adSpendByMonth, loading, error, source }
}
