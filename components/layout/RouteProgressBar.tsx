"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export function RouteProgressBar() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(true)
    const timer = window.setTimeout(() => setActive(false), 600)
    return () => window.clearTimeout(timer)
  }, [pathname])

  if (!active) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden bg-primary/15"
      aria-hidden
    >
      <div className="route-progress-bar h-full w-1/3 bg-primary" />
    </div>
  )
}
