"use client"

import { usePathname } from "next/navigation"

import { ClientContextBar } from "@/components/admin/ClientContextBar"
import { AppTopbar } from "@/components/layout/AppTopbar"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { cn } from "cn"

const LOGGED_OUT_PATHS = new Set(["/logget-ud", "/login"])

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { organization, role } = useActiveOrganization()
  const isLoggedOut = LOGGED_OUT_PATHS.has(pathname)
  const showClientContextBar =
    !isLoggedOut && role === "censio_admin" && organization !== null

  return (
    <div
      className={cn(
        "flex min-h-full flex-col",
        isLoggedOut ? "bg-background" : "dashboard-page"
      )}
    >
      <AppTopbar />
      {showClientContextBar ? <ClientContextBar /> : null}
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8 xl:px-10">{children}</main>
    </div>
  )
}
