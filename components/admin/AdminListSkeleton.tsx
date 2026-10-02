"use client"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { cn } from "cn"

/** A single skeleton row: icon, two lines of text, and an optional action. */
export function AdminListRowSkeleton({ hasAction = true }: { hasAction?: boolean }) {
  return (
    <div className={cn(adminSectionCardClass, "flex items-center gap-3 px-4 py-3")}>
      <div className="size-9 shrink-0 animate-pulse rounded-lg bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
      </div>
      {hasAction ? <div className="size-8 shrink-0 animate-pulse rounded-md bg-muted" /> : null}
    </div>
  )
}

/** A skeleton for a list of rows. */
export function AdminListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, index) => (
        <AdminListRowSkeleton key={index} />
      ))}
    </div>
  )
}

/** A skeleton for a card with a header and a list inside. */
export function AdminCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div
      className={cn(adminSectionCardClass, "overflow-hidden")}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="border-b border-[#e8e0d8] px-4 py-3 sm:px-5">
        <div className="h-10 w-full max-w-xs animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="divide-y divide-[#f0e9e2]">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-40 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="size-8 shrink-0 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
