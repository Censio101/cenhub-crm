import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Indlæser overblik">
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Card key={index} className="dashboard-card gap-3 py-4">
            <Skeleton className="mx-4 h-3 w-20" />
            <Skeleton className="mx-4 h-8 w-28" />
            <Skeleton className="mx-4 h-4 w-24" />
          </Card>
        ))}
      </div>
      <Card className="dashboard-card p-5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-3 h-[240px] w-full sm:h-[320px]" />
      </Card>
    </div>
  )
}

export function DashboardEmptyState() {
  return (
    <Card className="dashboard-card px-5 py-8 text-center">
      <p className="text-sm font-medium text-[var(--text-primary)]">Ingen leads i den valgte periode</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Prøv en anden periode, service, funnel eller Privat/Erhverv, eller vent til de første leads kommer ind.
      </p>
    </Card>
  )
}

export function DashboardErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="dashboard-card px-5 py-8 text-center">
      <p className="text-sm font-medium text-[var(--text-primary)]">Kunne ikke hente nøgletal</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Der opstod en fejl. Prøv igen om et øjeblik.
      </p>
      <Button className="mt-4" variant="outline" onClick={onRetry}>
        Prøv igen
      </Button>
    </Card>
  )
}

export function PartialDataNotice() {
  return (
    <p className="text-xs text-[var(--text-muted)]">
      Ufuldstændige data – perioden rækker ud over de tilgængelige måneder.
    </p>
  )
}
