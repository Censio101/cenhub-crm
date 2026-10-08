import { Suspense } from "react"

import { PerformanceDashboard } from "@/components/performance/PerformanceDashboard"
import { ClientPageBootstrapSpinner } from "@/components/client/ClientPageBootstrapSpinner"

export default function HomePage() {
  return (
    <Suspense fallback={<ClientPageBootstrapSpinner />}>
      <PerformanceDashboard />
    </Suspense>
  )
}
