"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

export function AuthHashErrorHandler() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes("error=")) return

    const params = new URLSearchParams(hash.slice(1))
    const errorCode = params.get("error_code") ?? params.get("error") ?? "auth_error"

    const loginUrl = new URL("/login", window.location.origin)
    loginUrl.searchParams.set("error", errorCode)

    window.history.replaceState(null, "", pathname)
    router.replace(`${loginUrl.pathname}${loginUrl.search}`)
  }, [pathname, router])

  return null
}
