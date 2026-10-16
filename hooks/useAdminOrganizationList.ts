"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

import { listPickerOrganizations, type PickerOrganization } from "@/lib/admin/client-picker"
import {
  ensureAdminPickerListLoaded,
  getAdminPickerListSnapshot,
  resetAdminPickerList,
  subscribeAdminPickerList,
} from "@/lib/data/admin-picker-list"
import { useAsyncEffect } from "@/lib/react/use-async-effect"

type UseAdminOrganizationListResult = {
  pickerOrganizations: PickerOrganization[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

export function useAdminOrganizationList(): UseAdminOrganizationListResult {
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

  const pickerOrganizations = useMemo(
    () => listPickerOrganizations(snapshot.clients),
    [snapshot.clients]
  )

  return {
    pickerOrganizations,
    loading: !snapshot.loaded,
    error: snapshot.error ? "fetch_failed" : null,
    reload,
  }
}
