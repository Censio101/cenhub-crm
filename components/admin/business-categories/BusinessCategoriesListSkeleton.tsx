"use client"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { cn } from "cn"

export function BusinessCategoriesListSkeleton({ rows = 3 }: { rows?: number }) {
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
        </div>
      ))}
    </div>
  )
}
