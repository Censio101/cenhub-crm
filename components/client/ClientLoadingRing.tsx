"use client"

import { cn } from "cn"

/** Shared ring — visible immediately (no empty flash before spin). */
export function ClientLoadingRing({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md"
}) {
  const dim = size === "sm" ? "size-8" : "size-10"
  return (
    <span
      aria-hidden="true"
      className={cn("relative block opacity-90", dim, className)}
    >
      <span className="absolute inset-0 rounded-full border-[3px] border-primary/15" />
      <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary [animation-duration:900ms]" />
    </span>
  )
}
