"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import type { LucideIcon } from "lucide-react"

import { isClientDashboardPath } from "@/lib/layout/app-paths"
import { cn } from "cn"

export type AppTopbarNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export function AppTopbarNavLinks({
  pathname,
  items,
}: {
  pathname: string
  items: AppTopbarNavItem[]
}) {
  const searchParams = useSearchParams()
  const dashboardFilterQuery =
    isClientDashboardPath(pathname) && searchParams.toString()
      ? `?${searchParams.toString()}`
      : ""

  return (
    <>
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={`${item.href}${dashboardFilterQuery}`}
            aria-label={item.label}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 px-2.5 py-2 text-base font-medium whitespace-nowrap transition-colors sm:px-3",
              "border-b-2 focus-visible:ring-3 focus-visible:ring-white/40 focus-visible:outline-none",
              active
                ? "border-primary text-white"
                : "border-transparent text-white/70 hover:border-primary hover:text-white"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">{item.label}</span>
          </Link>
        )
      })}
    </>
  )
}

export function AppTopbarNavSkeleton() {
  return (
    <>
      {[0, 1, 2].map((key) => (
        <span
          key={key}
          className="inline-flex h-9 w-20 animate-pulse rounded-md bg-white/10 sm:w-24"
          aria-hidden="true"
        />
      ))}
    </>
  )
}
