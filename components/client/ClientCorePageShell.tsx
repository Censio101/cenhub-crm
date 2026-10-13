"use client"

import type { ReactNode } from "react"

import { cn } from "cn"

/**
 * Shared layout for dashboard, leads, and kunder — same min-height and gaps so nav never “jumps”.
 */
export function ClientCorePageShell({
  header,
  children,
  bodyClassName,
}: {
  header: ReactNode
  children: ReactNode
  bodyClassName?: string
}) {
  return (
    <div className="client-core-page flex min-h-[calc(100dvh-9rem)] w-full flex-1 flex-col gap-6">
      <div className="client-core-settle-header shrink-0">{header}</div>
      <div
        className={cn(
          "client-core-settle-body flex min-h-0 min-w-0 flex-1 flex-col",
          bodyClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
