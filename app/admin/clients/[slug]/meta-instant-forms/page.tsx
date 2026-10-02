import { Suspense } from "react"

import { AdminClientMetaInstantFormsPanel } from "@/components/admin/AdminClientMetaInstantFormsPanel"

function MetaInstantFormsFallback() {
  return <p className="text-sm text-muted-foreground">…</p>
}

export default function AdminClientMetaInstantFormsPage() {
  return (
    <Suspense fallback={<MetaInstantFormsFallback />}>
      <AdminClientMetaInstantFormsPanel />
    </Suspense>
  )
}
