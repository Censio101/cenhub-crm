"use client"

import { ClientManageIdentitySkeleton } from "@/components/admin/ClientManageIdentitySkeleton"
import { clientInitialsFromName } from "@/lib/admin/format-client-display-name"

type ClientManageScopeIdentityProps = {
  displayName: string
  isTransitioning: boolean
}

export function ClientManageScopeIdentity({
  displayName,
  isTransitioning,
}: ClientManageScopeIdentityProps) {
  if (isTransitioning) {
    return <ClientManageIdentitySkeleton variant="scope" className="flex-none" />
  }

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-sm font-semibold text-white"
        aria-hidden="true"
      >
        {clientInitialsFromName(displayName)}
      </span>
      <p className="min-w-0 truncate text-base font-semibold leading-tight text-foreground">
        {displayName}
      </p>
    </div>
  )
}
