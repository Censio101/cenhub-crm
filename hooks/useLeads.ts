"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { NO_ACTIVE_ORGANIZATION_ERROR } from "@/lib/auth/active-organization"
import type { MessageKey } from "@/lib/i18n"
import {
  CLIENT_ORG_CHANGED_EVENT,
  getLeadsCache,
  hasLeadsCache,
  setLeadsCache,
} from "@/lib/data/client-cache"
import type { LeadPatch } from "@/lib/db/lead-mapper"
import { fetchCompanyConfig, leadSheetOrDefault } from "@/lib/data/company-config"
import { buildDefaultLeadSheetConfig } from "@/lib/lead-sheet/default-config"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import type { Lead } from "@/lib/leads"
import { useAsyncEffect } from "@/lib/react/use-async-effect"

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

/** Minimum time between focus-triggered refreshes of the lead sheet config. */
const SHEET_REFRESH_MIN_MS = 60_000

/** `null` when the request fails, so a transient error never replaces a good config. */
async function fetchLeadSheetConfigOrNull(): Promise<ResolvedLeadSheetConfig | null> {
  return leadSheetOrDefault(await fetchCompanyConfig())
}

async function fetchLeadSheetConfig(): Promise<ResolvedLeadSheetConfig> {
  return (await fetchLeadSheetConfigOrNull()) ?? buildDefaultLeadSheetConfig()
}

export function useLeads() {
  const cached = getLeadsCache()
  const [leads, setLeads] = useState<Lead[]>(() => cached?.leads ?? [])
  const [leadSheet, setLeadSheet] = useState<ResolvedLeadSheetConfig>(() =>
    buildDefaultLeadSheetConfig()
  )
  const [loading, setLoading] = useState(() => !hasLeadsCache())
  const [error, setError] = useState<MessageKey | null>(null)
  const [needsClientSelection, setNeedsClientSelection] = useState(false)
  const [dataSource, setDataSource] = useState<"mock" | "supabase">(
    () => cached?.source ?? "supabase"
  )
  const pendingPatches = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const lastSheetFetchRef = useRef(0)

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
          setError("leadsSelectClient")
          setLeadsCache({ leads: [], source: "supabase" })
          setLeadSheet(buildDefaultLeadSheetConfig())
          return
        }

        throw new Error("leadsLoadError")
      }

      setLeads(data.leads)
      setDataSource(data.source)
      setLeadsCache({
        leads: data.leads,
        source: data.source,
        organizationSlug: data.organization?.slug ?? null,
      })

      if (data.source === "supabase") {
        const sheet = await fetchLeadSheetConfig()
        lastSheetFetchRef.current = Date.now()
        setLeadSheet(sheet)
      } else {
        setLeadSheet(buildDefaultLeadSheetConfig())
      }
    } catch (loadError) {
      console.error(loadError)
      setLeads([])
      setDataSource("supabase")
      setError("leadsLoadError")
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useAsyncEffect(() => {
    void loadLeads()
  }, [loadLeads])

  // An admin may change the client's lead sheet while this page stays open in a tab.
  // Re-check when the tab is used again (at most once a minute) so columns stay current.
  useEffect(() => {
    if (dataSource !== "supabase") return

    const refreshSheet = () => {
      if (document.visibilityState !== "visible") return
      if (Date.now() - lastSheetFetchRef.current < SHEET_REFRESH_MIN_MS) return
      lastSheetFetchRef.current = Date.now()
      void fetchLeadSheetConfigOrNull().then((sheet) => {
        if (!sheet) return
        setLeadSheet((current) =>
          JSON.stringify(current) === JSON.stringify(sheet) ? current : sheet
        )
      })
    }

    window.addEventListener("focus", refreshSheet)
    document.addEventListener("visibilitychange", refreshSheet)
    return () => {
      window.removeEventListener("focus", refreshSheet)
      document.removeEventListener("visibilitychange", refreshSheet)
    }
  }, [dataSource])

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
          throw new Error("leadsSaveError")
        }

        const data = (await response.json()) as { lead: Lead }
        setLeads((current) => {
          const next = current.map((lead) => (lead.id === id ? data.lead : lead))
          setLeadsCache({ leads: next, source: dataSource })
          return next
        })
      } catch (patchError) {
        console.error(patchError)
        setError("leadsSaveError")
      }
    },
    [dataSource]
  )

  const updateLead = useCallback(
    (id: string, patch: LeadPatch) => {
      setLeads((current) => {
        const next = current.map((lead) => {
          if (lead.id !== id) return lead
          if (patch.customFields !== undefined) {
            return {
              ...lead,
              ...patch,
              customFields: { ...lead.customFields, ...patch.customFields },
            }
          }
          return { ...lead, ...patch }
        })
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
          throw new Error("leadsCreateError")
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
        setError("leadsCreateError")
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
          throw new Error("leadsDeleteError")
        }
      } catch (deleteError) {
        console.error(deleteError)
        setError("leadsDeleteError")
        await loadLeads()
      }
    },
    [dataSource, loadLeads]
  )

  return {
    leads,
    leadSheet,
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
