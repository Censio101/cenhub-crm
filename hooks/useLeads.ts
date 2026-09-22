"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { NO_ACTIVE_ORGANIZATION_ERROR } from "@/lib/auth/active-organization"
import {
  CLIENT_ORG_CHANGED_EVENT,
  getLeadsCache,
  hasLeadsCache,
  setLeadsCache,
} from "@/lib/data/client-cache"
import type { LeadPatch } from "@/lib/db/lead-mapper"
import { MOCK_LEADS, type Lead } from "@/lib/leads"

type LeadsResponse = {
  leads: Lead[]
  source: "mock" | "supabase"
  organization?: {
    id: string
    slug: string
    name: string
    demoMode: boolean
  }
  error?: string
  message?: string
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

export function useLeads() {
  const cached = getLeadsCache()
  const [leads, setLeads] = useState<Lead[]>(() => cached?.leads ?? [])
  const [loading, setLoading] = useState(() => !hasLeadsCache())
  const [error, setError] = useState<string | null>(null)
  const [needsClientSelection, setNeedsClientSelection] = useState(false)
  const [dataSource, setDataSource] = useState<"mock" | "supabase">(
    () => cached?.source ?? "mock"
  )
  const pendingPatches = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  )

  const loadLeads = useCallback(async () => {
    const showLoading = !hasLeadsCache()
    if (showLoading) setLoading(true)
    setError(null)
    setNeedsClientSelection(false)

    try {
      const response = await fetch("/api/leads", { cache: "no-store" })
      const data = (await response.json()) as LeadsResponse

      if (!response.ok) {
        if (data.error === NO_ACTIVE_ORGANIZATION_ERROR) {
          setLeads([])
          setDataSource("supabase")
          setNeedsClientSelection(true)
          setError(data.message ?? "Vælg en klient for at se deres dashboard.")
          setLeadsCache({ leads: [], source: "supabase" })
          return
        }

        if (await shouldUseMockFallback()) {
          setLeads(MOCK_LEADS)
          setDataSource("mock")
          setLeadsCache({ leads: MOCK_LEADS, source: "mock" })
          setError("Viser demo-data — database ikke tilgængelig")
          return
        }

        throw new Error(data.message ?? "Kunne ikke hente leads")
      }

      setLeads(data.leads)
      setDataSource(data.source)
      setLeadsCache({
        leads: data.leads,
        source: data.source,
        organizationSlug: data.organization?.slug ?? null,
      })
    } catch (loadError) {
      console.error(loadError)
      if (await shouldUseMockFallback()) {
        setLeads(MOCK_LEADS)
        setDataSource("mock")
        setLeadsCache({ leads: MOCK_LEADS, source: "mock" })
        setError("Viser demo-data — database ikke tilgængelig")
      } else {
        setLeads([])
        setDataSource("supabase")
        setError(
          loadError instanceof Error ? loadError.message : "Kunne ikke hente leads"
        )
      }
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLeads()
  }, [loadLeads])

  useEffect(() => {
    const onOrgChanged = () => {
      void loadLeads()
    }
    window.addEventListener(CLIENT_ORG_CHANGED_EVENT, onOrgChanged)
    return () => window.removeEventListener(CLIENT_ORG_CHANGED_EVENT, onOrgChanged)
  }, [loadLeads])

  const persistPatch = useCallback(
    async (id: string, patch: LeadPatch) => {
      if (dataSource === "mock") return

      try {
        const response = await fetch(`/api/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })

        if (!response.ok) {
          throw new Error("Kunne ikke gemme lead")
        }

        const data = (await response.json()) as { lead: Lead }
        setLeads((current) => {
          const next = current.map((lead) => (lead.id === id ? data.lead : lead))
          setLeadsCache({ leads: next, source: dataSource })
          return next
        })
      } catch (patchError) {
        console.error(patchError)
        setError("Ændring kunne ikke gemmes")
      }
    },
    [dataSource]
  )

  const updateLead = useCallback(
    (id: string, patch: LeadPatch) => {
      setLeads((current) => {
        const next = current.map((lead) =>
          lead.id === id ? { ...lead, ...patch } : lead
        )
        setLeadsCache({ leads: next, source: dataSource })
        return next
      })

      if (dataSource === "mock") return

      const existing = pendingPatches.current.get(id)
      if (existing) clearTimeout(existing)

      pendingPatches.current.set(
        id,
        setTimeout(() => {
          pendingPatches.current.delete(id)
          void persistPatch(id, patch)
        }, 400)
      )
    },
    [dataSource, persistPatch]
  )

  const createLead = useCallback(
    async (lead: Lead) => {
      setLeads((current) => {
        const next = [lead, ...current]
        setLeadsCache({ leads: next, source: dataSource })
        return next
      })

      if (dataSource === "mock") return lead

      try {
        const response = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead }),
        })

        if (!response.ok) {
          throw new Error("Kunne ikke oprette lead")
        }

        const data = (await response.json()) as { lead: Lead }
        setLeads((current) => {
          const next = current.map((item) => (item.id === lead.id ? data.lead : item))
          setLeadsCache({ leads: next, source: dataSource })
          return next
        })
        return data.lead
      } catch (createError) {
        console.error(createError)
        setError("Lead kunne ikke oprettes")
        await loadLeads()
        return lead
      }
    },
    [dataSource, loadLeads]
  )

  const deleteLead = useCallback(
    async (id: string) => {
      setLeads((current) => {
        const next = current.filter((lead) => lead.id !== id)
        setLeadsCache({ leads: next, source: dataSource })
        return next
      })

      if (dataSource === "mock") return

      try {
        const response = await fetch(`/api/leads/${id}`, { method: "DELETE" })
        if (!response.ok) {
          throw new Error("Kunne ikke slette lead")
        }
      } catch (deleteError) {
        console.error(deleteError)
        setError("Lead kunne ikke slettes")
        await loadLeads()
      }
    },
    [dataSource, loadLeads]
  )

  return {
    leads,
    loading,
    error,
    needsClientSelection,
    dataSource,
    updateLead,
    createLead,
    deleteLead,
    reload: loadLeads,
  }
}
