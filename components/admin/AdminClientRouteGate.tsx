"use client"

import type { ReactNode } from "react"

import { SelectClientEmptyState } from "@/components/admin/SelectClientEmptyState"
import { DashboardSkeleton } from "@/components/performance/DashboardStates"
import { useAdminClientPickerGate } from "@/hooks/useAdminClientPickerGate"

/** Skeleton while restoring cookie org; picker when admin has no client; otherwise children. */
export function AdminClientRouteGate({ children }: { children: ReactNode }) {
  const { mustPickClient, resolvingActiveClient } = useAdminClientPickerGate()

  if (resolvingActiveClient) {
    return <DashboardSkeleton />
  }

  if (mustPickClient) {
    return <SelectClientEmptyState />
  }

  return children
}
