"use client"

import { usePathname } from "next/navigation"

import { ClientSwitcher } from "@/components/admin/ClientSwitcher"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"

const CLIENT_DASHBOARD_PREFIXES = ["/", "/overblik", "/leads", "/kunder", "/indstillinger"]

function isClientDashboardPath(pathname: string) {
  if (pathname === "/") return true
  return CLIENT_DASHBOARD_PREFIXES.some(
    (prefix) => prefix !== "/" && pathname.startsWith(prefix)
  )
}

export function AdminNoOrgBanner() {
  const pathname = usePathname()
  const { needsClientSelection, loading } = useActiveOrganization()

  if (loading || !needsClientSelection || !isClientDashboardPath(pathname)) {
    return null
  }

  return (
    <div
      className="mb-6 rounded-[15px] border border-amber-200/80 bg-amber-50 px-4 py-4 text-sm text-amber-950 sm:px-5"
      role="status"
    >
      <p className="font-medium">Censio admin visning</p>
      <p className="mt-1 text-amber-900/90">
        Du er logget ind som Censio admin. Vælg en klient for at se og redigere
        deres dashboard.
      </p>
      <div className="mt-3 max-w-sm">
        <ClientSwitcher />
      </div>
    </div>
  )
}
