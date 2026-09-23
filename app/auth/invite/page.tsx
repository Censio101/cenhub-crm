import { Suspense } from "react"

import { InviteAcceptForm } from "@/components/auth/InviteAcceptForm"

function InviteFallback() {
  return (
    <div className="mx-auto flex max-w-lg justify-center py-10">
      <div className="h-56 w-full animate-pulse rounded-2xl bg-muted/70" />
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={<InviteFallback />}>
      <InviteAcceptForm />
    </Suspense>
  )
}
