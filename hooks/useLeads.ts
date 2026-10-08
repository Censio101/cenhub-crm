"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { NO_ACTIVE_ORGANIZATION_ERROR } from "@/lib/auth/active-organization"
import type { MessageKey } from "@/lib/i18n"
import {
  CLIENT_ORG_CHANGED_EVENT,
  getLeadsCache,
  hasLeadsCache,
  emitCustomersRefresh,
  replaceCachedLeads,
  setLeadsCache,
} from "@/lib/data/client-cache"
import { fetchJsonDeduped } from "@/lib/data/in-flight"
import { createRequestGuard } from "@/lib/data/request-guard"
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

export type SaveStatus = "idle" | "saving" | "saved" | "error"

/** Applies an edit to a lead; custom fields are merged key by key. */
function applyPatchToLead(lead: Lead, patch: LeadPatch): Lead {
  if (patch.customFields !== undefined) {
    return {
      ...lead,
      ...patch,
      customFields: { ...lead.customFields, ...patch.customFields },
    }
  }
  return { ...lead, ...patch }
}

/** Combines two edits of the same lead (later values win, custom fields merge). */
function mergeLeadPatches(first: LeadPatch | undefined, second: LeadPatch): LeadPatch {
  if (!first) return second
  const merged: LeadPatch = { ...first, ...second }
  if (first.customFields !== undefined || second.customFields !== undefined) {
    merged.customFields = { ...first.customFields, ...second.customFields }
  }
  return merged
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
  const { organization } = useActiveOrganization()
  const activeSlug = organization?.slug ?? null
  const [leads, setLeads] = useState<Lead[]>(() => getLeadsCache(activeSlug)?.leads ?? [])
  const [leadSheet, setLeadSheet] = useState<ResolvedLeadSheetConfig>(() =>
    buildDefaultLeadSheetConfig()
  )
  const [loading, setLoading] = useState(() => !hasLeadsCache(activeSlug))
  const [error, setError] = useState<MessageKey | null>(null)
  const [needsClientSelection, setNeedsClientSelection] = useState(false)
  const [dataSource, setDataSource] = useState<"mock" | "supabase">(
    () => getLeadsCache(activeSlug)?.source ?? "supabase"
  )
  const pendingPatches = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  /** Edits waiting for the debounce timer, merged per lead. */
  const pendingData = useRef<Map<string, LeadPatch>>(new Map())
  const inflightSaves = useRef(0)
  const saveFailed = useRef(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const lastSheetFetchRef = useRef(0)
  const [guard] = useState(createRequestGuard)

  useEffect(() => () => guard.dispose(), [guard])

  const loadLeads = useCallback(async () => {
    const isCurrent = guard.begin()
    const showLoading = !hasLeadsCache()
    if (showLoading) setLoading(true)
    setError(null)
    setNeedsClientSelection(false)

    try {
      const result = await fetchJsonDeduped<LeadsResponse>("/api/leads")
      if (!isCurrent()) return
      const data = result.data

      if (!result.ok || !data) {
        if (data?.error === NO_ACTIVE_ORGANIZATION_ERROR) {
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
        if (!isCurrent()) return
        lastSheetFetchRef.current = Date.now()
        setLeadSheet(sheet)
      } else {
        setLeadSheet(buildDefaultLeadSheetConfig())
      }
    } catch (loadError) {
      if (!isCurrent()) return
      console.error(loadError)
      // Keep the leads already on screen; only surface the error (with a retry in the UI).
      setError("leadsLoadError")
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [guard])

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
      // Drop the previous client's leads immediately; never show them while the new client loads.
      setLeads([])
      setLeadSheet(buildDefaultLeadSheetConfig())
      setLoading(true)
      void loadLeads()
    }
    window.addEventListener(CLIENT_ORG_CHANGED_EVENT, onOrgChanged)
    return () => window.removeEventListener(CLIENT_ORG_CHANGED_EVENT, onOrgChanged)
  }, [loadLeads])

  const persistPatch = useCallback(
    async (id: string, patch: LeadPatch) => {
      if (dataSource === "mock") return

      inflightSaves.current += 1
      setSaveStatus("saving")

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
        // Newer edits are still queued for this lead: keep what is on screen instead of
        // overwriting the user's latest typing with this (older) server copy.
        if (!pendingData.current.has(id)) {
          setLeads((current) => {
            const next = current.map((lead) => (lead.id === id ? data.lead : lead))
            replaceCachedLeads(next, dataSource)
            return next
          })
        }
        emitCustomersRefresh()
      } catch (patchError) {
        console.error(patchError)
        saveFailed.current = true
        setError("leadsSaveError")
      } finally {
        inflightSaves.current -= 1
        if (inflightSaves.current === 0 && pendingData.current.size === 0) {
          setSaveStatus(saveFailed.current ? "error" : "saved")
          saveFailed.current = false
        }
      }
    },
    [dataSource]
  )

  const updateLead = useCallback(
    (id: string, patch: LeadPatch) => {
      setLeads((current) => {
        const next = current.map((lead) => (lead.id === id ? applyPatchToLead(lead, patch) : lead))
        replaceCachedLeads(next, dataSource)
        return next
      })

      if (dataSource === "mock") return

      // Edits to different fields inside the debounce window are merged, never dropped.
      pendingData.current.set(id, mergeLeadPatches(pendingData.current.get(id), patch))
      setSaveStatus("saving")

      const existing = pendingPatches.current.get(id)
      if (existing) clearTimeout(existing)

      pendingPatches.current.set(
        id,
        setTimeout(() => {
          pendingPatches.current.delete(id)
          const queued = pendingData.current.get(id)
          pendingData.current.delete(id)
          if (queued) void persistPatch(id, queued)
        }, 400)
      )
    },
    [dataSource, persistPatch]
  )

  /** Sends queued edits right away (used when the tab is closed or hidden). */
  useEffect(() => {
    const flush = () => {
      for (const [id, timer] of pendingPatches.current) {
        clearTimeout(timer)
        const queued = pendingData.current.get(id)
        if (queued) {
          void fetch(`/api/leads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(queued),
            keepalive: true,
          })
        }
      }
      pendingPatches.current.clear()
      pendingData.current.clear()
    }
    window.addEventListener("pagehide", flush)
    return () => window.removeEventListener("pagehide", flush)
  }, [])

  /**
   * Saves one lead from the edit popup and waits for the server. Failures are thrown (with the
   * server's message) so the popup can stay open and show them. Edits still queued from the
   * sheet are sent in the same request.
   */
  const saveLead = useCallback(
    async (id: string, patch: LeadPatch): Promise<Lead> => {
      const timer = pendingPatches.current.get(id)
      if (timer) clearTimeout(timer)
      pendingPatches.current.delete(id)
      const queued = pendingData.current.get(id)
      pendingData.current.delete(id)
      const merged = mergeLeadPatches(queued, patch)

      const replaceLocal = (saved: Lead) =>
        setLeads((current) => {
          const next = current.map((lead) => (lead.id === id ? saved : lead))
          replaceCachedLeads(next, dataSource)
          return next
        })

      if (dataSource === "mock") {
        let updated: Lead | null = null
        setLeads((current) => {
          const next = current.map((lead) => {
            if (lead.id !== id) return lead
            updated = applyPatchToLead(lead, merged)
            return updated
          })
          replaceCachedLeads(next, dataSource)
          return next
        })
        return updated ?? (merged as Lead)
      }

      inflightSaves.current += 1
      setSaveStatus("saving")
      try {
        let response: Response
        try {
          response = await fetch(`/api/leads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(merged),
          })
        } catch (networkError) {
          console.error(networkError)
          throw new Error("leadsSaveError")
        }

        const data = (await response.json().catch(() => null)) as {
          lead?: Lead
          error?: string
        } | null

        if (!response.ok || !data?.lead) {
          throw new Error(data?.error || "leadsSaveError")
        }

        replaceLocal(data.lead)
        emitCustomersRefresh()
        setError(null)
        saveFailed.current = false
        return data.lead
      } catch (saveError) {
        saveFailed.current = true
        throw saveError
      } finally {
        inflightSaves.current -= 1
        if (inflightSaves.current === 0 && pendingData.current.size === 0) {
          setSaveStatus(saveFailed.current ? "error" : "saved")
          saveFailed.current = false
        }
      }
    },
    [dataSource]
  )

  /**
   * Creates a lead. The list only gains the lead once the server confirmed it, and failures
   * are thrown (with the server's message) so the add-lead popup can stay open and show them.
   */
  const createLead = useCallback(
    async (lead: Lead) => {
      const prepend = (created: Lead) =>
        setLeads((current) => {
          const next = [created, ...current.filter((item) => item.id !== created.id)]
          replaceCachedLeads(next, dataSource)
          return next
        })

      if (dataSource === "mock") {
        prepend(lead)
        return lead
      }

      let response: Response
      try {
        response = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead }),
        })
      } catch (networkError) {
        console.error(networkError)
        throw new Error("leadsCreateError")
      }

      const data = (await response.json().catch(() => null)) as {
        lead?: Lead
        error?: string
      } | null

      if (!response.ok || !data?.lead) {
        throw new Error(data?.error || "leadsCreateError")
      }

      prepend(data.lead)
      if (data.lead.status === "won") emitCustomersRefresh()
      return data.lead
    },
    [dataSource]
  )

  const deleteLead = useCallback(
    async (id: string) => {
      setLeads((current) => {
        const next = current.filter((lead) => lead.id !== id)
        replaceCachedLeads(next, dataSource)
        return next
      })

      if (dataSource === "mock") return

      try {
        const response = await fetch(`/api/leads/${id}`, { method: "DELETE" })
        if (!response.ok) {
          throw new Error("leadsDeleteError")
        }
        emitCustomersRefresh()
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
    saveStatus,
    updateLead,
    saveLead,
    createLead,
    deleteLead,
    reload: loadLeads,
  }
}
