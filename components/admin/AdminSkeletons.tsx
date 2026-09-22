import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function AdminClientListSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Indlæser klienter">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[15px] border border-border bg-card px-4 py-4 sm:px-5"
        >
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-4 w-32" />
          <div className="mt-3 flex flex-wrap gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function AdminClientDetailSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-6"
      aria-busy="true"
      aria-label="Indlæser klient"
    >
      <header className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
      </header>

      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-10 w-full max-w-sm" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function AdminCardSkeleton({ label }: { label: string }) {
  return (
    <Card aria-busy="true" aria-label={label}>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full max-w-xs" />
      </CardContent>
    </Card>
  )
}
