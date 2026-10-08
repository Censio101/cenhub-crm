"use client"

import type { ReactNode } from "react"

import { SelectClientEmptyState } from "@/components/admin/SelectClientEmptyState"
import { ClientPageBootstrapSpinner } from "@/components/client/ClientPageBootstrapSpinner"
import { useAdminClientPickerGate } from "@/hooks/useAdminClientPickerGate"

/** Skeleton while restoring cookie org; picker when admin has no client; otherwise children. */
export function AdminClientRouteGate({ children }: { children: ReactNode }) {
  const { mustPickClient, resolvingActiveClient } = useAdminClientPickerGate()

  if (resolvingActiveClient) {
    return <ClientPageBootstrapSpinner />
  }

  if (mustPickClient) {
    return <SelectClientEmptyState />
  }

  return children
}
