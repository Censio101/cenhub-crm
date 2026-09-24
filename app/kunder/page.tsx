import { Suspense } from "react"

import { CustomersBoard } from "@/components/customers/CustomersBoard"
import { DashboardSkeleton } from "@/components/performance/DashboardStates"

export default function KunderPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <CustomersBoard />
    </Suspense>
  )
}
