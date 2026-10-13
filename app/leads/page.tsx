import { Suspense } from "react"

import { LeadsBoard } from "@/components/leads/LeadsBoard"
import { ClientRouteFallback } from "@/components/client/ClientRouteFallback"

export default function LeadsPage() {
  return (
    <Suspense fallback={<ClientRouteFallback />}>
      <LeadsBoard />
    </Suspense>
  )
}
