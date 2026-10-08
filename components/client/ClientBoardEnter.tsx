"use client"

import type { ReactNode } from "react"

import { cn } from "cn"

/**
 * Wraps client board content that replaces loading skeletons.
 *
 * - Enter: a very short opacity-only fade (no movement), skipped for reduced-motion users.
 * - `pending`: while filters/range change, the current numbers stay visible but slightly dimmed
 *   with a thin progress line above them — instead of falling back to skeletons.
 */
export function ClientBoardEnter({
  children,
  className,
  pending = false,
}: {
  children: ReactNode
  className?: string
  pending?: boolean
}) {
  return (
    <div
      className={cn(
        "relative motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150 motion-safe:ease-out",
        "transition-opacity duration-200",
        pending && "opacity-60",
        className
      )}
      aria-busy={pending || undefined}
    >
      {pending ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-3 h-0.5 overflow-hidden rounded-full bg-primary/10"
        >
          <span className="client-progress-bar block h-full w-1/3 rounded-full bg-primary/70" />
        </span>
      ) : null}
      {children}
    </div>
  )
}
