"use client"

import type { ReactNode } from "react"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { cn } from "cn"

export function MetaInstantFormsLeadsTableSkeleton() {
  return (
    <div className="overflow-x-auto px-4 pb-4 pt-2">
      <div className="mb-3 grid grid-cols-4 gap-3 border-b border-[#e8e0d8] pb-3 pl-1">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-3 w-16 animate-pulse rounded bg-muted" />
        ))}
      </div>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-4 gap-3 border-b border-[#e8e0d8]/60 py-3 last:border-0"
        >
          <div className="h-4 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
          <div className="hidden h-4 w-20 animate-pulse rounded-md bg-muted lg:block" />
        </div>
      ))}
    </div>
  )
}

export function MetaInstantFormsLeadsPanelShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn(adminSectionCardClass, "overflow-hidden p-0", className)}>{children}</div>
  )
}
