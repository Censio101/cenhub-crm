import { Suspense } from "react"

import { ClientRouteFallback } from "@/components/client/ClientRouteFallback"
import { CustomersBoard } from "@/components/customers/CustomersBoard"

export default function KunderPage() {
  return (
    <Suspense fallback={<ClientRouteFallback />}>
      <CustomersBoard />
    </Suspense>
  )
}
