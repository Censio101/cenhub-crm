"use client"

import { useCallback, useMemo, useState } from "react"

import { listPickerOrganizations, type PickerOrganization } from "@/lib/admin/client-picker"
import type { HubClient } from "@/lib/admin/hub-clients"
import { useAsyncEffect } from "@/lib/react/use-async-effect"

type UseAdminOrganizationListResult = {
  pickerOrganizations: PickerOrganization[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const MAX_ATTEMPTS = 3

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Fetch the picker list, retrying transient failures so a blip never looks like "no clients". */
async function fetchPickerClients(): Promise<HubClient[] | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch("/api/admin/organizations/picker", {
        cache: "no-store",
        credentials: "include",
      })
      if (response.ok) {
        const data = (await response.json()) as { clients?: HubClient[] }
        const clients = data.clients ?? []
        // #region agent log
        fetch("http://127.0.0.1:7295/ingest/3efac2fa-9b4f-402f-9f78-550675d5de3e", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "138f58" },
          body: JSON.stringify({
            sessionId: "138f58",
            hypothesisId: "H2",
            location: "useAdminOrganizationList.ts",
            message: "picker_fetch_ok",
            data: { attempt, rawCount: clients.length, inAppWithSlug: clients.filter((c) => c.inApp && c.slug).length },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
        // #endregion
        return clients
      }
    } catch {
      // retry below
    }
    if (attempt < MAX_ATTEMPTS) await wait(400 * attempt)
  }
  return null
}

export function useAdminOrganizationList(): UseAdminOrganizationListResult {
  const [clients, setClients] = useState<HubClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await fetchPickerClients()
    if (result) {
      setClients(result)
    } else {
      setError("fetch_failed")
    }
    setLoading(false)
  }, [])

  useAsyncEffect(() => {
    void reload()
  }, [reload])

  const pickerOrganizations = useMemo(() => listPickerOrganizations(clients), [clients])

  return { pickerOrganizations, loading, error, reload }
}
