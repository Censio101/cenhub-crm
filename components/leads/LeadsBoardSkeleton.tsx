import { Skeleton } from "@/components/ui/skeleton"

export function LeadsBoardSkeleton() {
  return (
    <div
      className="flex min-h-[calc(100dvh-9rem)] w-full flex-col gap-6"
      aria-busy="true"
      aria-label="Indlæser leads"
    >
      <header className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-48 rounded-full" />
          <Skeleton className="h-9 w-44 rounded-full" />
          <Skeleton className="h-9 w-52 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-[15px]" />
        ))}
      </div>

      <section className="dashboard-card flex min-h-[420px] flex-1 flex-col overflow-hidden p-4">
        <div className="mb-3 flex gap-3 border-b border-border pb-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-20" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-md" />
          ))}
        </div>
      </section>
    </div>
  )
}
