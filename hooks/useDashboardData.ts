"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { NO_ACTIVE_ORGANIZATION_ERROR } from "@/lib/auth/active-organization"
import type { MessageKey } from "@/lib/i18n"
import {
  CLIENT_LEADS_UPDATED_EVENT,
  CLIENT_ORG_CHANGED_EVENT,
  getAdSpendCache,
  getLeadsCache,
  hasFreshAdSpendCache,
  hasFreshLeadsCache,
  hasLeadsCache,
  setAdSpendCache,
  setLeadsCache,
} from "@/lib/data/client-cache"
import { fetchJsonDeduped } from "@/lib/data/in-flight"
import { createRequestGuard } from "@/lib/data/request-guard"
import { parseFormStepsTotal, withoutPartialLeads } from "@/lib/lead-sheet/form-steps"
import type { Lead } from "@/lib/leads"
import { useAsyncEffect } from "@/lib/react/use-async-effect"

type AdSpendSource = "synced" | "demo" | "pending"

type DashboardDataState = {
  /** Leads the dashboard counts: partial leads of a stepped form are left out. */
  leads: Lead[]
  /** Leads that only filled a stepped form partly (shown as their own metric). */
  partialLeads: Lead[]
  /** Total steps of the client's stepped form; null when the sheet has none. */
  formStepsTotal: number | null
  adSpendByMonth: Record<string, number>
  adSpendSource: AdSpendSource
  metaEnabled: boolean
  metaLastSyncedAt: string | null
  loading: boolean
  error: MessageKey | null
  needsClientSelection: boolean
  source: "mock" | "supabase"
  reload: () => Promise<void>
}

type LeadsPayload = {
  leads: Lead[]
  formStepsTotal?: number | null
  source?: "mock" | "supabase"
  organization?: { slug?: string }
  error?: string
  message?: string
}

type AdSpendPayload = {
  adSpendByMonth?: Record<string, number>
  source?: AdSpendSource
  metaEnabled?: boolean
  metaLastSyncedAt?: string | null
}

function cachedFormStepsTotal(
  entry: ReturnType<typeof getLeadsCache> | null | undefined
): number | null {
  return parseFormStepsTotal(entry?.formStepsTotal ?? entry?.leadSheet?.template.formStepsTotal)
}

export function useDashboardData(): DashboardDataState {
  const { organization, needsClientSelection: adminMustPickClient, sessionReady } =
    useActiveOrganization()
  const activeSlug = organization?.slug ?? null

  const [allLeads, setLeads] = useState<Lead[]>(() => getLeadsCache(activeSlug)?.leads ?? [])
  const [formStepsTotal, setFormStepsTotal] = useState<number | null>(() =>
    cachedFormStepsTotal(getLeadsCache(activeSlug))
  )
  const [adSpendByMonth, setAdSpendByMonth] = useState<Record<string, number>>(
    () => getAdSpendCache(activeSlug) ?? {}
  )
  const [loading, setLoading] = useState(() => !hasLeadsCache(activeSlug))
  const [error, setError] = useState<MessageKey | null>(null)
  const [needsClientSelection, setNeedsClientSelection] = useState(false)
  const [source, setSource] = useState<"mock" | "supabase">(
    () => getLeadsCache(activeSlug)?.source ?? "supabase"
  )
  const [adSpendSource, setAdSpendSource] = useState<AdSpendSource>("pending")
  const [metaEnabled, setMetaEnabled] = useState(false)
  const [metaLastSyncedAt, setMetaLastSyncedAt] = useState<string | null>(null)
  const [guard] = useState(createRequestGuard)

  useEffect(() => () => guard.dispose(), [guard])

  const load = useCallback(async () => {
    const isCurrent = guard.begin()
    if (!sessionReady) {
      if (isCurrent()) setLoading(true)
      return
    }
    if (adminMustPickClient) {
      if (isCurrent()) {
        setLoading(false)
        setError(null)
        setNeedsClientSelection(true)
      }
      return
    }
    const showLoading = !hasLeadsCache(activeSlug)
    if (showLoading) setLoading(true)
    setError(null)
    setNeedsClientSelection(false)

    const freshLeads = hasFreshLeadsCache(activeSlug)
    const freshAdSpend = hasFreshAdSpendCache(activeSlug)
    if (freshLeads && freshAdSpend) {
      const cached = getLeadsCache(activeSlug)!
      const adSpend = getAdSpendCache(activeSlug) ?? {}
      if (isCurrent()) {
        setLeads(cached.leads)
        setFormStepsTotal(cachedFormStepsTotal(cached))
        setSource(cached.source)
        setAdSpendByMonth(adSpend)
        setLoading(false)
      }
      return
    }

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

      const nextFormStepsTotal = parseFormStepsTotal(leadsPayload.formStepsTotal)
      setLeads(leadsPayload.leads)
      setFormStepsTotal(nextFormStepsTotal)
      setAdSpendByMonth(nextAdSpend)
      setAdSpendSource(adSpendResult.data?.source ?? "pending")
      setMetaEnabled(Boolean(adSpendResult.data?.metaEnabled))
      setMetaLastSyncedAt(adSpendResult.data?.metaLastSyncedAt ?? null)
      setSource(nextSource)
      setLeadsCache({
        leads: leadsPayload.leads,
        formStepsTotal: nextFormStepsTotal,
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
      if (isCurrent() && showLoading) {
        setLoading(false)
      }
    }
  }, [activeSlug, guard, adminMustPickClient, sessionReady])

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

  useEffect(() => {
    const onLeadsUpdated = () => {
      const cached = getLeadsCache(activeSlug)
      if (cached?.leads) {
        setLeads(cached.leads)
        setFormStepsTotal(cachedFormStepsTotal(cached))
      }
    }
    window.addEventListener(CLIENT_LEADS_UPDATED_EVENT, onLeadsUpdated)
    return () => window.removeEventListener(CLIENT_LEADS_UPDATED_EVENT, onLeadsUpdated)
  }, [activeSlug])

  const leads = useMemo(() => withoutPartialLeads(allLeads, formStepsTotal), [allLeads, formStepsTotal])
  const partialLeads = useMemo(() => {
    if (formStepsTotal === null) return []
    const complete = new Set(leads.map((lead) => lead.id))
    return allLeads.filter((lead) => !complete.has(lead.id))
  }, [allLeads, formStepsTotal, leads])

  return {
    leads,
    partialLeads,
    formStepsTotal,
    adSpendByMonth,
    adSpendSource,
    metaEnabled,
    metaLastSyncedAt,
    loading,
    error,
    needsClientSelection,
    source,
    reload: load,
  }
}
