"use client"

import { useSession, type SessionReloadOptions } from "@/components/session/SessionProvider"
import type { UserRole } from "@/lib/db/types"
import type { OrganizationLogoBackground } from "@/lib/organization-logo"

export type ActiveOrganization = {
  id: string
  slug: string
  name: string
  demoMode: boolean
  logoUrl: string | null
  logoBackground: OrganizationLogoBackground
  profileComplete: boolean
  hvidbjergPartner: boolean
}

type ActiveOrganizationState = {
  organization: ActiveOrganization | null
  role: UserRole | null
  isAdminViewingClient: boolean
  needsClientSelection: boolean
  loading: boolean
  setActiveOrganization: (slug: string | null) => Promise<boolean>
  reload: (options?: SessionReloadOptions) => Promise<void>
  patchOrganization: (patch: Partial<ActiveOrganization>) => void
}

export function useActiveOrganization(): ActiveOrganizationState {
  const ctx = useSession()
  return {
    organization: ctx.organization,
    role: ctx.role,
    isAdminViewingClient: ctx.isAdminViewingClient,
    needsClientSelection: ctx.needsClientSelection,
    loading: ctx.loading,
    setActiveOrganization: ctx.setActiveOrganization,
    reload: ctx.reload,
    patchOrganization: ctx.patchOrganization,
  }
}
