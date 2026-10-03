"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FileTextIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  UsersIcon,
} from "lucide-react"

import { ProfileMenu } from "@/components/layout/ProfileMenu"
import { cn } from "cn"

const INTERNAL_NAV_MAIN = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/admin/omkostninger", label: "Omkostninger", icon: ReceiptIcon },
  { href: "/admin/kunder", label: "Kunder", icon: UsersIcon },
] as const

const INTERNAL_NAV_RIGHT = [{ href: "/admin/tilbud", label: "Tilbud", icon: FileTextIcon }] as const

type InternalNavItem = (typeof INTERNAL_NAV_MAIN)[number] | (typeof INTERNAL_NAV_RIGHT)[number]

function NavLink({ item, pathname }: { item: InternalNavItem; pathname: string }) {
  const active =
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 px-2 py-2 text-sm font-medium whitespace-nowrap transition-colors sm:gap-2 sm:px-3 sm:text-base",
        "border-b-2 focus-visible:ring-3 focus-visible:ring-white/40 focus-visible:outline-none",
        active
          ? "border-primary text-white"
          : "border-transparent text-white/70 hover:border-primary hover:text-white"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  )
}

export function AppTopbar() {
  const pathname = usePathname()

  return (
    <header className="relative sticky top-0 z-40 box-border grid w-full max-w-full min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 overflow-hidden bg-[#0a0a0a] bg-[linear-gradient(90deg,#8f3608_0%,#5c2206_42%,#140c08_76%,#0a0a0a_100%)] px-[5%] py-2 sm:gap-x-3 xl:h-20 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:py-0">
      <div className="z-10 col-start-1 row-start-1 flex min-w-0 items-center justify-self-start">
        <Link
          href="/admin"
          className="flex min-w-0 items-end gap-2.5 sm:gap-3"
          aria-label="Censio Internal"
        >
          <Image
            src="/censio-logo-white.png"
            alt="Censio"
            width={1024}
            height={251}
            className="h-9 w-auto sm:h-10"
            priority
          />
          <span className="mb-[-0.06em] select-none text-base font-medium leading-none tracking-wide text-white sm:text-[1.15rem]">
            Internal
          </span>
        </Link>
      </div>

      <nav
        className="z-10 col-span-2 row-start-2 flex w-full min-w-0 items-center justify-between gap-2 overflow-x-auto sm:gap-3 xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:max-w-2xl xl:justify-self-center"
        aria-label="Hovedmenu"
      >
        <div className="flex min-w-0 items-center gap-0.5 sm:gap-2">
          {INTERNAL_NAV_MAIN.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          {INTERNAL_NAV_RIGHT.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </nav>

      <div className="z-10 col-start-2 row-start-1 flex min-w-0 items-center justify-self-end xl:col-start-3">
        <ProfileMenu />
      </div>
    </header>
  )
}
