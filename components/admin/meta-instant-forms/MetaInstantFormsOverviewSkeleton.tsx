"use client"

import type { ReactNode } from "react"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { cn } from "cn"

export function MetaInstantFormsSetupStepsSkeleton() {
  return (
    <ol
      className={cn(adminSectionCardClass, "grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4")}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="flex gap-2.5">
          <div className="mt-0.5 size-4 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-[85%] max-w-[12rem] animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded-md bg-muted/80" />
          </div>
        </li>
      ))}
    </ol>
  )
}

export function MetaInstantFormsRealtimeSkeleton() {
  return (
    <div
      className="space-y-3 border-t border-[#e8e0d8] px-4 py-4"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="rounded-xl border border-[#e8e0d8] bg-[#faf8f6] px-4 py-3">
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-9 min-w-0 flex-1 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-16 shrink-0 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
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
