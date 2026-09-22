"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

function isClientAppPath(pathname: string) {
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/logget-ud") ||
    pathname.startsWith("/auth")
  ) {
    return false
  }
  return true
}

export function AdminClientGate() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!isClientAppPath(pathname)) return

    let cancelled = false

    async function redirectIfAdminHasNoClient() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })
        if (!response.ok || cancelled) return
        const data = (await response.json()) as {
          role?: string | null
          organization?: { id: string } | null
        }
        if (cancelled) return
        if (data.role === "censio_admin" && !data.organization) {
          router.replace("/admin")
        }
      } catch {
        // Leave the current page if the session check fails.
      }
    }

    void redirectIfAdminHasNoClient()

    return () => {
      cancelled = true
    }
  }, [pathname, router])

  return null
}
