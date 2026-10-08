"use client"

import { useEffect, useRef } from "react"

import { useAdminOrganizationList } from "@/hooks/useAdminOrganizationList"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"

/**
 * Censio admins land on the client dashboard (`/`). If no active org cookie exists yet,
 * pick the first client from the picker list (sorted by name). The cookie persists
 * across logouts so the last opened client is restored on next login.
 */
export function AdminActiveClientBootstrap() {
  const { role, organization, loading, needsClientSelection, setActiveOrganization } =
    useActiveOrganization()
  const { pickerOrganizations, loading: listLoading } = useAdminOrganizationList()
  const bootstrappingRef = useRef(false)

  useEffect(() => {
    if (loading || listLoading) return
    if (role !== "censio_admin") return
    if (organization) return
    if (!needsClientSelection) return
    if (bootstrappingRef.current) return

    const first = pickerOrganizations[0]
    if (!first) return

    bootstrappingRef.current = true
    void setActiveOrganization(first.slug).finally(() => {
      bootstrappingRef.current = false
    })
  }, [
    loading,
    listLoading,
    role,
    organization,
    needsClientSelection,
    pickerOrganizations,
    setActiveOrganization,
  ])

  return null
}
