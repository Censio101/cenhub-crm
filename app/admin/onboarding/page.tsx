import { Suspense } from "react"

import { AdminOnboardingBoard } from "@/components/admin/AdminOnboardingBoard"

export default function AdminOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <AdminOnboardingBoard />
    </Suspense>
  )
}
