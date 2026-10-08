import { Suspense } from "react"

import { LeadsBoard } from "@/components/leads/LeadsBoard"
import { ClientPageBootstrapSpinner } from "@/components/client/ClientPageBootstrapSpinner"

export default function LeadsPage() {
  return (
    <Suspense fallback={<ClientPageBootstrapSpinner />}>
      <LeadsBoard />
    </Suspense>
  )
}
