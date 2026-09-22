import { Suspense } from "react"

import { OverviewBoard } from "@/components/overview/OverviewBoard"
import { DashboardSkeleton } from "@/components/performance/DashboardStates"

export default function OverblikPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OverviewBoard />
    </Suspense>
  )
}
