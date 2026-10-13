"use client"

import type { ReactNode } from "react"

import type { NavigationZone } from "@/lib/layout/client-navigation-zones"
import { cn } from "cn"

export function MainContentTransition({
  zone,
  zoneChanged,
  children,
}: {
  zone: NavigationZone
  zoneChanged: boolean
  children: ReactNode
}) {
  return (
    <div
      key={zone}
      className={cn(
        "flex min-w-0 flex-1 flex-col",
        zoneChanged &&
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150 motion-safe:ease-out motion-reduce:animate-none"
      )}
    >
      {children}
    </div>
  )
}
