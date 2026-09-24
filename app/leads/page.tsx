import { Suspense } from "react"

import { LeadsBoard } from "@/components/leads/LeadsBoard"
import { DashboardSkeleton } from "@/components/performance/DashboardStates"

export default function LeadsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LeadsBoard />
    </Suspense>
  )
}
