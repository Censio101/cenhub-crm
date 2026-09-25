"use client"

import { useOptionalAdminClient } from "@/components/admin/AdminClientContext"
import { useOptionalAdminClientSwitch } from "@/components/admin/AdminClientSwitchContext"

export function useAdminClientPending() {
  const client = useOptionalAdminClient()
  const switchContext = useOptionalAdminClientSwitch()

  const slug = client?.slug ?? null
  const organization = client?.organization ?? null
  const loading = client?.loading ?? false
  const switchingSlug = switchContext?.switchingSlug ?? null

  const organizationMatchesRoute =
    Boolean(organization) && Boolean(slug) && organization!.slug === slug

  const contentReady = organizationMatchesRoute && !loading
  const isSwitching = switchingSlug !== null
  /** Switching chrome (label, overlay) only while data for the new client is not ready yet. */
  const showSwitchingUI = isSwitching && !contentReady

  const isColdLoad = loading && !organization && !isSwitching
  const isPending = !contentReady
  const isReady = contentReady

  return {
    slug,
    organization,
    loading,
    switchingSlug,
    isSwitching,
    showSwitchingUI,
    isColdLoad,
    isPending,
    isReady,
    contentReady,
  }
}
