"use client"

import type { ReactNode } from "react"

import { cn } from "cn"

/**
 * Wraps board content after load. Filter changes dim in place — no route-style motion here.
 */
export function ClientBoardEnter({
  children,
  className,
  pending = false,
  animateEnter: _animateEnter = false,
}: {
  children: ReactNode
  className?: string
  pending?: boolean
  /** Reserved; route motion lives on ClientCorePageShell body only. */
  animateEnter?: boolean
}) {
  return (
    <div
      className={cn(
        "relative",
        pending && "opacity-[0.72] transition-opacity duration-100 ease-out",
        className
      )}
      aria-busy={pending || undefined}
    >
      {pending ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-3 h-px overflow-hidden bg-primary/10"
        >
          <span className="client-progress-bar block h-full w-1/4 rounded-full bg-primary/50" />
        </span>
      ) : null}
      {children}
    </div>
  )
}
