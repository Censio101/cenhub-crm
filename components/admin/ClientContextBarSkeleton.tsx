import { cn } from "cn"

import { outfit } from "@/lib/fonts/app-fonts"

/** Placeholder while session/org resolves — matches `ClientContextBar` height to avoid layout shift. */
export function ClientContextBarSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "admin-ui w-full min-w-0 overflow-x-clip border-b border-[#d3c3b2] bg-[#faf8f6]",
        outfit.className,
        className
      )}
      aria-busy="true"
      aria-hidden="true"
    >
      <div className="flex min-w-0 flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 lg:px-8 xl:px-10">
        <div className="h-9 w-44 max-w-[70%] animate-pulse rounded-[10px] bg-[#efe8e0]" />
        <div className="flex items-center justify-end gap-3">
          <div className="hidden h-4 w-32 animate-pulse rounded-md bg-[#efe8e0] sm:block" />
          <div className="h-10 w-48 max-w-[60vw] animate-pulse rounded-full bg-[#efe8e0]" />
        </div>
      </div>
    </div>
  )
}
