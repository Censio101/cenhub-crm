import { Suspense } from "react"

import { ClientRouteFallback } from "@/components/client/ClientRouteFallback"
import { PerformanceDashboard } from "@/components/performance/PerformanceDashboard"

export default function HomePage() {
  return (
    <Suspense fallback={<ClientRouteFallback />}>
      <PerformanceDashboard />
    </Suspense>
  )
}
