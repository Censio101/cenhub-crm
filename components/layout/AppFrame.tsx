"use client"

import { usePathname } from "next/navigation"

import { AppTopbar } from "@/components/layout/AppTopbar"
import { cn } from "cn"

const LOGGED_OUT_PATHS = new Set(["/logget-ud"])

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoggedOut = LOGGED_OUT_PATHS.has(pathname)

  return (
    <div
      className={cn(
        "flex min-h-full flex-col",
        isLoggedOut ? "bg-background" : "dashboard-page"
      )}
    >
      <AppTopbar />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
        {children}
      </main>
    </div>
  )
}
