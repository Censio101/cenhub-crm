import type { Metadata } from "next"
import { Suspense } from "react"

import { InternalLoginScreen } from "@/components/internal/InternalLoginScreen"

export const metadata: Metadata = {
  title: "Log ind – Censio Internal",
  description: "Log ind på Censio Internal",
}

export default function InternalLoginPage() {
  return (
    <Suspense fallback={null}>
      <InternalLoginScreen />
    </Suspense>
  )
}
