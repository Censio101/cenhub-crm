import { Suspense } from "react"

import { CustomersBoard } from "@/components/customers/CustomersBoard"
import { ClientPageBootstrapSpinner } from "@/components/client/ClientPageBootstrapSpinner"

export default function KunderPage() {
  return (
    <Suspense fallback={<ClientPageBootstrapSpinner />}>
      <CustomersBoard />
    </Suspense>
  )
}
