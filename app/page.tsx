import { Suspense } from "react"

import { PerformanceDashboard } from "@/components/performance/PerformanceDashboard"
import { DashboardSkeleton } from "@/components/performance/DashboardStates"

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <PerformanceDashboard />
    </Suspense>
  )
}
