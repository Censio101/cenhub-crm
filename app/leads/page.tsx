import { Suspense } from "react"

import { ClientRouteFallback } from "@/components/client/ClientRouteFallback"
import { LeadsBoard } from "@/components/leads/LeadsBoard"

export default function LeadsPage() {
  return (
    <Suspense fallback={<ClientRouteFallback />}>
      <LeadsBoard />
    </Suspense>
  )
}
