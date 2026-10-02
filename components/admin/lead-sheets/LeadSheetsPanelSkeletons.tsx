"use client"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "cn"

export function LeadSheetsListRowSkeleton() {
  return (
    <div className={cn(adminSectionCardClass, "flex items-center gap-3 p-3 sm:px-4")}>
      <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-2/3 max-w-[14rem] animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-28 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="size-8 shrink-0 animate-pulse rounded-md bg-muted" />
    </div>
  )
}

export function LeadSheetsTemplatesListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, index) => (
        <LeadSheetsListRowSkeleton key={index} />
      ))}
    </div>
  )
}

export function LeadSheetsCategoriesListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={cn(adminSectionCardClass, "space-y-3 p-4 sm:p-5")}>
          <div className="flex items-center gap-3">
            <div className="size-4 animate-pulse rounded bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
          <div className="space-y-2 border-t border-[#e8e0d8] pt-3 pl-7">
            <div className="h-9 w-full animate-pulse rounded-lg bg-muted/60" />
            <div className="h-9 w-full max-w-md animate-pulse rounded-lg bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Mirrors the template editor: compact summary card, then the columns list. */
export function LeadSheetTemplateEditorSkeleton({
  embedded,
  showClientBanner,
}: {
  embedded?: boolean
  showClientBanner?: boolean
}) {
  return (
    <div
      className={cn("mx-auto flex w-full flex-col gap-6", embedded ? "max-w-none" : "max-w-4xl")}
      aria-busy="true"
      aria-live="polite"
    >
      {showClientBanner ? (
        <div
          className={cn(
            adminSectionCardClass,
            "flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          )}
        >
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-9 w-44 shrink-0 rounded-md" />
        </div>
      ) : null}

      <div className={cn(adminSectionCardClass, "px-4 py-3.5 sm:px-5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-48 max-w-full" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
          <Skeleton className="h-7 w-28 shrink-0 rounded-lg" />
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-[#efe7de] pt-3">
          <Skeleton className="size-3.5 shrink-0 rounded" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-9 w-full rounded-xl sm:w-64" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className={cn(adminSectionCardClass, "flex items-center gap-3 px-3 py-2.5")}
            >
              <Skeleton className="size-4 shrink-0 rounded" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-1/3 max-w-[12rem] rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
              <Skeleton className="size-8 shrink-0 rounded-md" />
              <Skeleton className="h-8 w-28 shrink-0 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function LeadSheetsHubPageSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-6"
      aria-busy="true"
      aria-live="polite"
    >
      <header>
        <Skeleton className="h-8 w-40" />
      </header>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Skeleton className="h-11 w-full flex-1 rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl lg:w-72" />
          <Skeleton className="h-11 w-full rounded-xl lg:w-36" />
        </div>
        <LeadSheetsTemplatesListSkeleton rows={4} />
      </div>
    </div>
  )
}
