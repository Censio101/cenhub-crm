import { Suspense } from "react"

import { PerformanceDashboard } from "@/components/performance/PerformanceDashboard"
import { ClientRouteFallback } from "@/components/client/ClientRouteFallback"

export default function HomePage() {
  return (
    <Suspense fallback={<ClientRouteFallback />}>
      <PerformanceDashboard />
    </Suspense>
  )
}
