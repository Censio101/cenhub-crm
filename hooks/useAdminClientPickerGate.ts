"use client"

import { useActiveOrganization } from "@/hooks/useActiveOrganization"

/**
 * True when a Censio admin must pick an active client (session resolved, no org).
 * While session is loading / restoring cookie org, use `resolvingActiveClient` + skeleton — not the picker.
 */
export function useAdminClientPickerGate() {
  const {
    needsClientSelection,
    organization,
    role,
    loading: sessionLoading,
    sessionReady,
  } = useActiveOrganization()

  const isClientRole = role === "client_admin" || role === "client_user"

  const mustPickClient =
    sessionReady && needsClientSelection && !sessionLoading

  /** Wait for /api/auth/me before showing an empty client dashboard (role still unknown). */
  const resolvingActiveClient =
    sessionLoading ||
    (!sessionReady && !isClientRole && !organization)

  const useAdminShell =
    role === "censio_admin" ||
    (resolvingActiveClient && !isClientRole) ||
    (mustPickClient && !isClientRole)

  return {
    mustPickClient,
    resolvingActiveClient,
    sessionPending: sessionLoading,
    useAdminShell,
    needsClientSelection,
    organization,
    role,
    sessionLoading,
    isClientRole,
  }
}
