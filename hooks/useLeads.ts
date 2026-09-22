"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
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
}

export function useLeads() {
  const cached = getLeadsCache()
  const [leads, setLeads] = useState<Lead[]>(() => cached?.leads ?? [])
  const [loading, setLoading] = useState(() => !hasLeadsCache())
  const [error, setError] = useState<string | null>(null)
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

    try {
      const response = await fetch("/api/leads", { cache: "no-store" })
      if (!response.ok) {
        throw new Error("Kunne ikke hente leads")
      }

      const data = (await response.json()) as LeadsResponse
      setLeads(data.leads)
      setDataSource(data.source)
      setLeadsCache({ leads: data.leads, source: data.source })
    } catch (loadError) {
      console.error(loadError)
      setLeads(MOCK_LEADS)
      setDataSource("mock")
      setLeadsCache({ leads: MOCK_LEADS, source: "mock" })
      setError("Viser demo-data — database ikke tilgængelig")
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLeads()
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
    dataSource,
    updateLead,
    createLead,
    deleteLead,
    reload: loadLeads,
  }
}
