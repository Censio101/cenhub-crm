"use client"

import { usePathname } from "next/navigation"

import { ClientContextBar } from "@/components/admin/ClientContextBar"
import { AppTopbar } from "@/components/layout/AppTopbar"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import {
  isAdminPath,
  isClientDashboardPath,
  isLoggedOutPath,
} from "@/lib/layout/app-paths"
import { cn } from "cn"

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { organization, role } = useActiveOrganization()
  const isLoggedOut = isLoggedOutPath(pathname)
  const isAdminRoute = !isLoggedOut && isAdminPath(pathname)
  const showClientContextBar =
    !isLoggedOut &&
    role === "censio_admin" &&
    organization !== null &&
    isClientDashboardPath(pathname)

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col",
        isLoggedOut ? "bg-background" : "dashboard-page"
      )}
    >
      <AppTopbar />
      {showClientContextBar ? <ClientContextBar /> : null}
      <main
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          isAdminRoute ? "p-0" : "px-4 py-8 sm:px-6 lg:px-8 xl:px-10"
        )}
      >
        {children}
      </main>
    </div>
  )
}
