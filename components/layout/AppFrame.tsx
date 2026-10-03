"use client"

import { usePathname } from "next/navigation"

import { AppTopbar } from "@/components/layout/AppTopbar"
import { cn } from "cn"

const LOGGED_OUT_PATHS = new Set(["/logget-ud", "/log-ind", "/login"])

function isPublicPath(pathname: string) {
  return (
    LOGGED_OUT_PATHS.has(pathname) ||
    pathname.startsWith("/velkommen/") ||
    pathname.startsWith("/tilbud/")
  )
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoggedOut = isPublicPath(pathname)

  if (
    pathname === "/log-ind" ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/tilbud/")
  ) {
    return <>{children}</>
  }

  return (
    <div
      className={cn(
        "flex min-h-full w-full max-w-full min-w-0 flex-col overflow-x-clip",
        isLoggedOut ? "bg-background" : "dashboard-page"
      )}
    >
      <AppTopbar />
      <main className="box-border w-full min-w-0 max-w-full flex-1 overflow-x-clip px-[5%] py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
