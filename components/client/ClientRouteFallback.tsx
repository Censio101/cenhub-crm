"use client"

import { ClientPageBootstrapSpinner } from "@/components/client/ClientPageBootstrapSpinner"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import {
  hasLeadsCache,
  isClientWorkspaceWarm,
} from "@/lib/data/client-cache"

/** Suspense fallback for client core routes — avoid spinner flash when workspace is warm. */
export function ClientRouteFallback() {
  const { organization } = useActiveOrganization()
  const slug = organization?.slug ?? null

  if (isClientWorkspaceWarm() || hasLeadsCache(slug)) {
    return <div className="min-h-[12rem] flex-1" aria-hidden="true" />
  }

  return <ClientPageBootstrapSpinner />
}
