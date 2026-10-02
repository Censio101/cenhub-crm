"use client"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { cn } from "cn"

export function MetaInstantFormsTableSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      <div className={cn(adminSectionCardClass, "overflow-hidden p-0")}>
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-[#e8e0d8] bg-[#fffcf9] py-3 pl-5 pr-5 sm:pl-6 sm:pr-6">
          <div className="h-3 w-12 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-14 animate-pulse rounded bg-muted justify-self-end" />
        </div>
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[1fr_auto_auto] items-start gap-3 border-b border-[#e8e0d8]/60 py-4 pl-5 pr-5 last:border-0 sm:pl-6 sm:pr-6"
          >
            <div className="min-w-0 space-y-2">
              <div className="h-4 w-full max-w-[14rem] animate-pulse rounded-md bg-muted" />
              <div className="h-2.5 w-24 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="h-3 w-20 animate-pulse rounded-md bg-muted" />
            <div className="flex justify-end gap-1.5">
              <div className="h-8 w-[4.5rem] animate-pulse rounded-md bg-muted" />
              <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
