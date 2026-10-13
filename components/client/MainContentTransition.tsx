"use client"

import { useLayoutEffect, useRef, type ReactNode } from "react"

import { isClientCorePath } from "@/lib/layout/client-navigation-zones"
import { cn } from "cn"

/** Triggers a single quiet body fade between client core routes (when `settle` is true). */
export function MainContentTransition({
  pathname,
  zoneFade,
  settle = true,
  children,
}: {
  pathname: string
  zoneFade: boolean
  settle?: boolean
  children: ReactNode
}) {
  const shellRef = useRef<HTMLDivElement>(null)
  const prevPathRef = useRef(pathname)

  useLayoutEffect(() => {
    const previousPath = prevPathRef.current
    const pathChanged = previousPath !== pathname
    prevPathRef.current = pathname

    if (!pathChanged || !settle) return

    const coreSwitch = isClientCorePath(previousPath) && isClientCorePath(pathname)
    if (!zoneFade && !coreSwitch) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const node = shellRef.current
    if (!node) return

    node.classList.remove("client-core-settle-active")
    void node.offsetWidth
    node.classList.add("client-core-settle-active")

    const done = () => node.classList.remove("client-core-settle-active")
    const fallback = window.setTimeout(done, 200)
    return () => window.clearTimeout(fallback)
  }, [pathname, zoneFade, settle])

  return (
    <div ref={shellRef} className={cn("relative flex min-w-0 flex-1 flex-col")}>
      {children}
    </div>
  )
}
