import { Skeleton } from "@/components/ui/skeleton"

export function PageLoadingShell() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Indlæser side">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-[320px] w-full rounded-[15px]" />
    </div>
  )
}
