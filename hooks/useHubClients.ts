"use client"

import { useCallback, useSyncExternalStore } from "react"

import type { HubClient } from "@/lib/admin/hub-clients"
import {
  ensureAdminPickerListLoaded,
  getAdminPickerListSnapshot,
  resetAdminPickerList,
  subscribeAdminPickerList,
} from "@/lib/data/admin-picker-list"
import { useAsyncEffect } from "@/lib/react/use-async-effect"

type UseHubClientsResult = {
  clients: HubClient[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

/** Client directory list — shares the deduped picker fetch with prefetch and scope bar. */
export function useHubClients(): UseHubClientsResult {
  const snapshot = useSyncExternalStore(
    subscribeAdminPickerList,
    getAdminPickerListSnapshot,
    getAdminPickerListSnapshot
  )

  useAsyncEffect(() => {
    void ensureAdminPickerListLoaded()
  }, [])

  const reload = useCallback(async () => {
    resetAdminPickerList()
    await ensureAdminPickerListLoaded()
  }, [])

  return {
    clients: snapshot.clients,
    loading: !snapshot.loaded,
    error: snapshot.error ? "fetch_failed" : null,
    reload,
  }
}
