"use client"

import { cn } from "cn"

type ClientManageIdentitySkeletonProps = {
  variant?: "sidebar" | "scope"
  className?: string
}

export function ClientManageIdentitySkeleton({
  variant = "scope",
  className,
}: ClientManageIdentitySkeletonProps) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2.5", className)} aria-hidden="true">
      <div
        className={cn(
          "shrink-0 bg-muted/60 motion-safe:animate-pulse motion-reduce:animate-none",
          variant === "scope" ? "size-10 rounded-xl" : "size-8 rounded-md"
        )}
      />
      <div
        className={cn(
          "h-3.5 min-w-0 flex-1 rounded-md bg-muted/60 motion-safe:animate-pulse motion-reduce:animate-none",
          variant === "sidebar" ? "w-[7.5rem] max-w-full" : "w-36 max-w-full"
        )}
      />
    </div>
  )
}

export function AdminClientScopeBarSkeleton() {
  return (
    <div
      className="admin-ui mb-6 w-full min-w-0 overflow-hidden rounded-xl border border-[#d3c3b2] bg-[#faf8f6]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex min-w-0 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <ClientManageIdentitySkeleton variant="scope" className="flex-none" />
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="h-9 w-28 rounded-full bg-muted/60 motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="h-9 w-32 rounded-[10px] bg-muted/60 motion-safe:animate-pulse motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  )
}
