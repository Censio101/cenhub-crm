"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { AdminClientAutoSelectProvider } from "@/components/admin/AdminClientAutoSelectContext"
import { ClientContextBar } from "@/components/admin/ClientContextBar"
import { ClientContextBarSkeleton } from "@/components/admin/ClientContextBarSkeleton"
import { LocaleSync } from "@/components/i18n/LocaleSync"
import { AuthHashErrorHandler } from "@/components/auth/AuthHashErrorHandler"
import { AppTopbar } from "@/components/layout/AppTopbar"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { ACTIVE_ORG_COOKIE } from "@/lib/auth/active-organization"
import {
  isAdminPath,
  isClientDashboardPath,
  isGuestShellPath,
  isPublicSignupPath,
} from "@/lib/layout/app-paths"
import { cn } from "cn"

function useLikelyAdminClientSession() {
  const [likely, setLikely] = useState(false)
  useEffect(() => {
    setLikely(document.cookie.includes(`${ACTIVE_ORG_COOKIE}=`))
  }, [])
  return likely
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { organization, role, loading: orgLoading } = useActiveOrganization()
  const likelyAdminClientSession = useLikelyAdminClientSession()
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
    role !== "client_admin" &&
    role !== "client_user" &&
    (role === "censio_admin" || (role === null && likelyAdminClientSession))

  const animateDashboardMain = onClientDashboard && !orgLoading

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
      <AdminClientAutoSelectProvider>
        <AppTopbar />
        {showClientContextBarSkeleton ? <ClientContextBarSkeleton /> : null}
        {showClientContextBar ? <ClientContextBar /> : null}
        <main
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            publicSignupPage && "bg-[#faf8f6]",
            isAdminRoute ? "min-h-0 p-0" : "px-4 py-8 sm:px-6 lg:px-8 xl:px-10",
            animateDashboardMain &&
              "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
          )}
        >
          {children}
        </main>
      </AdminClientAutoSelectProvider>
    </div>
  )
}
