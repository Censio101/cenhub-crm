"use client"

import { useCallback, useEffect, useState } from "react"

import { NO_ACTIVE_ORGANIZATION_ERROR } from "@/lib/auth/active-organization"
import type { MessageKey } from "@/lib/i18n"
import {
  CLIENT_ORG_CHANGED_EVENT,
  getAdSpendCache,
  getLeadsCache,
  hasLeadsCache,
  setAdSpendCache,
  setLeadsCache,
} from "@/lib/data/client-cache"
import type { Lead } from "@/lib/leads"
import { useAsyncEffect } from "@/lib/react/use-async-effect"

type DashboardDataState = {
  leads: Lead[]
  adSpendByMonth: Record<string, number>
  loading: boolean
  error: MessageKey | null
  needsClientSelection: boolean
  source: "mock" | "supabase"
}

export function useDashboardData(): DashboardDataState {
  const cachedLeads = getLeadsCache()
  const cachedAdSpend = getAdSpendCache()
  const [leads, setLeads] = useState<Lead[]>(() => cachedLeads?.leads ?? [])
  const [adSpendByMonth, setAdSpendByMonth] = useState<Record<string, number>>(
    () => cachedAdSpend ?? {}
  )
  const [loading, setLoading] = useState(() => !hasLeadsCache())
  const [error, setError] = useState<MessageKey | null>(null)
  const [needsClientSelection, setNeedsClientSelection] = useState(false)
  const [source, setSource] = useState<"mock" | "supabase">(
    () => cachedLeads?.source ?? "supabase"
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
          // #region agent log
          fetch("http://127.0.0.1:7295/ingest/3efac2fa-9b4f-402f-9f78-550675d5de3e", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "138f58" },
            body: JSON.stringify({
              sessionId: "138f58",
              hypothesisId: "H3",
              location: "useDashboardData.ts",
              message: "data_needs_client_selection",
              data: { status: leadsResponse.status },
              timestamp: Date.now(),
            }),
          }).catch(() => {})
          // #endregion
          setLeads([])
          setAdSpendByMonth({})
          setSource("supabase")
          setNeedsClientSelection(true)
          setError("leadsSelectClient")
          setLeadsCache({ leads: [], source: "supabase" })
          setAdSpendCache({})
          return
        }

        throw new Error("leadsLoadError")
      }

      let nextAdSpend: Record<string, number> = {}
      if (adSpendResponse.ok) {
        const adSpendPayload = (await adSpendResponse.json()) as {
          adSpendByMonth: Record<string, number>
        }
        nextAdSpend = adSpendPayload.adSpendByMonth ?? {}
      }

      const nextSource = leadsPayload.source === "supabase" ? "supabase" : "mock"

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
      setLeads([])
      setAdSpendByMonth({})
      setSource("supabase")
      setError("leadsLoadError")
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useAsyncEffect(() => {
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
