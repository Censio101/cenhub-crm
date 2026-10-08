"use client"

import { useActiveOrganization } from "@/hooks/useActiveOrganization"

/**
 * True when a Censio admin must pick an active client (session resolved, no org).
 * While session is loading / restoring cookie org, use `resolvingActiveClient` + skeleton — not the picker.
 */
export function useAdminClientPickerGate() {
  const { needsClientSelection, organization, role, loading: sessionLoading } =
    useActiveOrganization()

  const isClientRole = role === "client_admin" || role === "client_user"
  const sessionPending =
    sessionLoading || (role === null && !isClientRole && !organization)

  const mustPickClient =
    role === "censio_admin" && !organization && !sessionPending

  /** Admin on client routes before /api/auth/me restores active org from cookie. */
  const resolvingActiveClient = sessionPending && !organization && !isClientRole

  const useAdminShell =
    role === "censio_admin" ||
    (resolvingActiveClient && !isClientRole) ||
    (mustPickClient && !isClientRole)

  return {
    mustPickClient,
    resolvingActiveClient,
    sessionPending,
    useAdminShell,
    needsClientSelection,
    organization,
    role,
    sessionLoading,
    isClientRole,
  }
}
