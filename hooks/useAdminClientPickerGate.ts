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

  /** Only while /api/auth/me (or auth bootstrap) is in flight — not when role is still null after a failed/cancelled fetch. */
  const sessionPending = sessionLoading

  const mustPickClient =
    role === "censio_admin" && !organization && !sessionLoading

  /** Admin on client routes before /api/auth/me restores active org from cookie. */
  const resolvingActiveClient = sessionLoading && !organization && !isClientRole

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
