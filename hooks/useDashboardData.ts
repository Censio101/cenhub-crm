"use client"

import { useCallback, useEffect, useState } from "react"

import { useActiveOrganization } from "@/hooks/useActiveOrganization"
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
import { fetchJsonDeduped } from "@/lib/data/in-flight"
import { createRequestGuard } from "@/lib/data/request-guard"
import type { Lead } from "@/lib/leads"
import { useAsyncEffect } from "@/lib/react/use-async-effect"

type DashboardDataState = {
  leads: Lead[]
  adSpendByMonth: Record<string, number>
  loading: boolean
  error: MessageKey | null
  needsClientSelection: boolean
  source: "mock" | "supabase"
  reload: () => Promise<void>
}

type LeadsPayload = {
  leads: Lead[]
  source?: "mock" | "supabase"
  organization?: { slug?: string }
  error?: string
  message?: string
}

type AdSpendPayload = {
  adSpendByMonth?: Record<string, number>
}

export function useDashboardData(): DashboardDataState {
  const { organization } = useActiveOrganization()
  const activeSlug = organization?.slug ?? null

  const [leads, setLeads] = useState<Lead[]>(() => getLeadsCache(activeSlug)?.leads ?? [])
  const [adSpendByMonth, setAdSpendByMonth] = useState<Record<string, number>>(
    () => getAdSpendCache(activeSlug) ?? {}
  )
  const [loading, setLoading] = useState(() => !hasLeadsCache(activeSlug))
  const [error, setError] = useState<MessageKey | null>(null)
  const [needsClientSelection, setNeedsClientSelection] = useState(false)
  const [source, setSource] = useState<"mock" | "supabase">(
    () => getLeadsCache(activeSlug)?.source ?? "supabase"
  )
  const [guard] = useState(createRequestGuard)

  useEffect(() => () => guard.dispose(), [guard])

  const load = useCallback(async () => {
    const isCurrent = guard.begin()
    const showLoading = !hasLeadsCache()
    if (showLoading) setLoading(true)
    setError(null)
    setNeedsClientSelection(false)

    try {
      const [leadsResult, adSpendResult] = await Promise.all([
        fetchJsonDeduped<LeadsPayload>("/api/leads"),
        fetchJsonDeduped<AdSpendPayload>("/api/metrics/ad-spend"),
      ])
      if (!isCurrent()) return

      const leadsPayload = leadsResult.data

      if (!leadsResult.ok || !leadsPayload) {
        if (leadsPayload?.error === NO_ACTIVE_ORGANIZATION_ERROR) {
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

      const nextAdSpend =
        adSpendResult.ok && adSpendResult.data?.adSpendByMonth
          ? adSpendResult.data.adSpendByMonth
          : {}
      const nextSource = leadsPayload.source === "supabase" ? "supabase" : "mock"
      const nextSlug = leadsPayload.organization?.slug ?? null

      setLeads(leadsPayload.leads)
      setAdSpendByMonth(nextAdSpend)
      setSource(nextSource)
      setLeadsCache({
        leads: leadsPayload.leads,
        source: nextSource,
        organizationSlug: nextSlug,
      })
      setAdSpendCache(nextAdSpend, nextSlug)
    } catch (loadError) {
      if (!isCurrent()) return
      console.error(loadError)
      // Keep whatever was already on screen; only surface the error.
      setError("leadsLoadError")
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [guard])

  useAsyncEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onOrgChanged = () => {
      // Drop the previous client's numbers immediately; never show them while the new client loads.
      setLeads([])
      setAdSpendByMonth({})
      setLoading(true)
      void load()
    }
    window.addEventListener(CLIENT_ORG_CHANGED_EVENT, onOrgChanged)
    return () => window.removeEventListener(CLIENT_ORG_CHANGED_EVENT, onOrgChanged)
  }, [load])

  return { leads, adSpendByMonth, loading, error, needsClientSelection, source, reload: load }
}
