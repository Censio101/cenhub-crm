"use client"

import { usePathname } from "next/navigation"

import { ClientContextBar } from "@/components/admin/ClientContextBar"
import { ClientContextBarSkeleton } from "@/components/admin/ClientContextBarSkeleton"
import { LocaleSync } from "@/components/i18n/LocaleSync"
import { AuthHashErrorHandler } from "@/components/auth/AuthHashErrorHandler"
import { AppTopbar } from "@/components/layout/AppTopbar"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import {
  isAdminPath,
  isClientDashboardPath,
  isGuestShellPath,
  isPublicSignupPath,
} from "@/lib/layout/app-paths"
import { cn } from "cn"

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { organization, role, loading: orgLoading, needsClientSelection } =
    useActiveOrganization()
  const guestShell = isGuestShellPath(pathname)
  const publicSignupPage = isPublicSignupPath(pathname)
  const isAdminRoute = !guestShell && isAdminPath(pathname)
  const onClientDashboard = isClientDashboardPath(pathname) && !guestShell && !isAdminRoute

  const showClientContextBar =
    !orgLoading &&
    role === "censio_admin" &&
    organization !== null &&
    onClientDashboard

  const showClientContextBarSkeleton =
    onClientDashboard &&
    orgLoading &&
    !needsClientSelection &&
    organization !== null &&
    role === "censio_admin"

  return (
    <div
      className={cn(
        "flex min-h-dvh min-w-0 flex-col overflow-x-clip",
        guestShell
          ? publicSignupPage
            ? "bg-[#faf8f6]"
            : "bg-background"
          : isAdminRoute
            ? "bg-background"
            : "dashboard-page"
      )}
    >
      <AuthHashErrorHandler />
      <LocaleSync />
      <AppTopbar />
      {showClientContextBarSkeleton ? <ClientContextBarSkeleton /> : null}
      {showClientContextBar ? <ClientContextBar /> : null}
      <main
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          publicSignupPage && "bg-[#faf8f6]",
          isAdminRoute ? "min-h-0 p-0" : "px-4 py-8 sm:px-6 lg:px-8 xl:px-10"
        )}
      >
        {children}
      </main>
    </div>
  )
}
