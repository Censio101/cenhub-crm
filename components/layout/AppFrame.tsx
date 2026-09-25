"use client"

import { usePathname } from "next/navigation"

import { LocaleSync } from "@/components/i18n/LocaleSync"
import { AuthHashErrorHandler } from "@/components/auth/AuthHashErrorHandler"
import { ClientContextBar } from "@/components/admin/ClientContextBar"
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
  const { organization, role, loading: orgLoading } = useActiveOrganization()
  const guestShell = isGuestShellPath(pathname)
  const publicSignupPage = isPublicSignupPath(pathname)
  const isAdminRoute = !guestShell && isAdminPath(pathname)
  const showClientContextBar =
    !orgLoading &&
    !guestShell &&
    role === "censio_admin" &&
    organization !== null &&
    isClientDashboardPath(pathname)

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
      {showClientContextBar ? <ClientContextBar /> : null}
      <main
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          publicSignupPage && "bg-[#faf8f6]",
          isAdminRoute ? "p-0" : "px-4 py-8 sm:px-6 lg:px-8 xl:px-10"
        )}
      >
        {children}
      </main>
    </div>
  )
}
