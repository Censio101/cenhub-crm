import { Suspense } from "react"

import { CustomersBoard } from "@/components/customers/CustomersBoard"
import { ClientRouteFallback } from "@/components/client/ClientRouteFallback"

export default function KunderPage() {
  return (
    <Suspense fallback={<ClientRouteFallback />}>
      <CustomersBoard />
    </Suspense>
  )
}
