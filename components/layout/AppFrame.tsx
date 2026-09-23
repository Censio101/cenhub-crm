"use client"

import { usePathname } from "next/navigation"

import { AuthHashErrorHandler } from "@/components/auth/AuthHashErrorHandler"
import { ClientContextBar } from "@/components/admin/ClientContextBar"
import { AppTopbar } from "@/components/layout/AppTopbar"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import {
  isAdminPath,
  isAuthPath,
  isClientDashboardPath,
  isLoggedOutPath,
} from "@/lib/layout/app-paths"
import { cn } from "cn"

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { organization, role, loading: orgLoading } = useActiveOrganization()
  const isLoggedOut = isLoggedOutPath(pathname)
  const isAuthRoute = isAuthPath(pathname)
  const isAdminRoute = !isLoggedOut && !isAuthRoute && isAdminPath(pathname)
  const showClientContextBar =
    !orgLoading &&
    !isLoggedOut &&
    !isAuthRoute &&
    role === "censio_admin" &&
    organization !== null &&
    isClientDashboardPath(pathname)

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col",
        isLoggedOut || isAuthRoute ? "bg-background" : "dashboard-page"
      )}
    >
      <AuthHashErrorHandler />
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
