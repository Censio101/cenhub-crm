import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

export function LeadPipelineSkeleton() {
  return (
    <section
      className="dashboard-card gap-0 px-6 py-5"
      aria-busy="true"
      aria-label="Indlæser pipeline"
    >
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="mt-5 h-2 w-full rounded-full" />
      <ul className="mt-5 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <li key={index} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-40" />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function LeadsTableSkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow key={index} className="hover:bg-transparent">
          <TableCell className="sticky left-0 z-[1] w-36 min-w-36 bg-card px-2">
            <Skeleton className="h-8 w-full rounded-md" />
          </TableCell>
          <TableCell className="sticky left-36 z-[1] min-w-44 border-r border-border bg-card px-2">
            <Skeleton className="h-8 w-full rounded-md" />
          </TableCell>
          {Array.from({ length: 12 }).map((__, cellIndex) => (
            <TableCell key={cellIndex} className="px-2">
              <Skeleton className="h-8 w-full rounded-md" />
            </TableCell>
          ))}
          <TableCell className="sticky right-0 z-[1] w-11 min-w-11 border-l border-border bg-card px-1">
            <Skeleton className="mx-auto size-8 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}
