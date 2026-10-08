"use client"

import { cn } from "cn"

/** Shared layout for /login, /logget-ud, and other guest auth pages. */
export function GuestAuthPageFrame({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-10 sm:py-14",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        className
      )}
    >
      {children}
    </div>
  )
}
