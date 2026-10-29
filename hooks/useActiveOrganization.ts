"use client"

import { useSession, type SessionReloadOptions } from "@/components/session/SessionProvider"
import type { UserRole } from "@/lib/db/types"
import type { OrganizationLogoBackground } from "@/lib/organization-logo"
import type { MetricId } from "@/lib/performance/types"

export type ActiveOrganization = {
  id: string
  slug: string
  name: string
  demoMode: boolean
  logoUrl: string | null
  logoBackground: OrganizationLogoBackground
  profileComplete: boolean
  hvidbjergPartner: boolean
  /** Dashboard KPI metrics a Censio admin has hidden for this client. */
  dashboardHiddenMetrics: MetricId[]
}

type ActiveOrganizationState = {
  organization: ActiveOrganization | null
  role: UserRole | null
  isAdminViewingClient: boolean
  needsClientSelection: boolean
  sessionReady: boolean
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
    sessionReady: ctx.sessionReady,
    loading: ctx.loading,
    setActiveOrganization: ctx.setActiveOrganization,
    reload: ctx.reload,
    patchOrganization: ctx.patchOrganization,
  }
}
