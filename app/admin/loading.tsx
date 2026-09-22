import { AdminClientListSkeleton } from "@/components/admin/AdminSkeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6" aria-busy="true">
      <header className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </header>
      <AdminClientListSkeleton />
    </div>
  )
}
