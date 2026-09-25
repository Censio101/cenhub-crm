"use client"

import { ClientManageIdentitySkeleton } from "@/components/admin/ClientManageIdentitySkeleton"
import { clientInitialsFromName } from "@/lib/admin/format-client-display-name"

type ClientManageScopeIdentityProps = {
  displayName: string
  slug: string
  isTransitioning: boolean
}

export function ClientManageScopeIdentity({
  displayName,
  slug,
  isTransitioning,
}: ClientManageScopeIdentityProps) {
  if (isTransitioning) {
    return <ClientManageIdentitySkeleton variant="scope" className="flex-none" />
  }

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-xs font-semibold text-white"
        aria-hidden="true"
      >
        {clientInitialsFromName(displayName)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
        <p className="font-mono text-xs text-muted-foreground">/{slug}</p>
      </div>
    </div>
  )
}
