"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2Icon,
  ContactRoundIcon,
  EyeIcon,
  LayoutDashboardIcon,
  UsersIcon,
} from "lucide-react"

import { useAccountSettings } from "@/components/account/AccountSettingsProvider"
import { ProfileMenu } from "@/components/layout/ProfileMenu"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { CURRENT_COMPANY } from "@/lib/company"
import { cn } from "cn"

const CLIENT_NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/overblik", label: "Overblik", icon: EyeIcon },
  { href: "/leads", label: "Leads", icon: ContactRoundIcon },
  { href: "/kunder", label: "Kunder", icon: UsersIcon },
] as const

const ALL_CLIENTS_NAV = {
  href: "/admin",
  label: "Alle klienter",
  icon: Building2Icon,
} as const

function isAllClientsPath(pathname: string) {
  if (pathname === "/admin") return true
  if (!pathname.startsWith("/admin/")) return false
  return !pathname.startsWith("/admin/meta") && !pathname.startsWith("/admin/settings")
}

export function AppTopbar() {
  const pathname = usePathname()
  const { settings } = useAccountSettings()
  const { organization, role } = useActiveOrganization()

  const isAdmin = role === "censio_admin"
  const adminHasClient = isAdmin && organization !== null
  const showClientBranding = !isAdmin && organization !== null
  const clientName = organization?.name ?? CURRENT_COMPANY.name
  const navItems = isAdmin
    ? adminHasClient
      ? [ALL_CLIENTS_NAV, ...CLIENT_NAV]
      : [ALL_CLIENTS_NAV]
    : CLIENT_NAV
  const homeHref = isAdmin && !organization ? "/admin" : "/"

  return (
    <header className="relative sticky top-0 z-40 grid min-h-[4.5rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 bg-[#0a0a0a] bg-[linear-gradient(90deg,#8f3608_0%,#5c2206_42%,#140c08_76%,#0a0a0a_100%)] px-4 py-2 sm:gap-x-3 sm:px-6 lg:px-8 xl:min-h-20 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_auto] xl:py-0">
      <div className="z-10 col-start-1 row-start-1 flex min-w-0 max-w-full items-center justify-self-start xl:max-w-[min(280px,35%)]">
        <Link
          href={homeHref}
          className="flex min-w-0 items-center gap-3.5 sm:gap-4"
          aria-label={
            showClientBranding ? `Censio × ${clientName}` : "Censio"
          }
        >
          <Image
            src="/censio-logo-white.png"
            alt="Censio"
            width={1024}
            height={251}
            className="h-9 w-auto shrink-0 sm:h-10"
            priority
          />
          {showClientBranding ? (
            <>
              <span
                className="select-none text-sm font-light leading-none text-white/45 sm:text-base"
                aria-hidden="true"
              >
                ×
              </span>
              {settings.logo.startsWith("data:") ||
              settings.logo.startsWith("blob:") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logo}
                  alt={clientName}
                  className="h-9 max-w-[min(120px,30vw)] w-auto shrink object-contain sm:h-10 sm:max-w-[140px]"
                />
              ) : (
                <Image
                  src={settings.logo}
                  alt={clientName}
                  width={176}
                  height={40}
                  className="h-9 max-w-[min(120px,30vw)] w-auto shrink object-contain sm:h-10 sm:max-w-[140px]"
                  priority
                  unoptimized
                />
              )}
            </>
          ) : null}
        </Link>
      </div>

      <nav
        className="z-10 col-span-2 row-start-2 -mx-4 flex min-w-0 max-w-[calc(100%+2rem)] items-center justify-start gap-0.5 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:max-w-[calc(100%+3rem)] sm:gap-2 sm:px-6 sm:justify-center lg:-mx-8 lg:max-w-[calc(100%+4rem)] lg:px-8 xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:mx-0 xl:max-w-none xl:justify-center xl:px-0 [&::-webkit-scrollbar]:hidden"
        aria-label="Hovedmenu"
      >
        {navItems.map((item) => {
          const active =
            item.href === "/admin"
              ? isAllClientsPath(pathname)
              : item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
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
      </nav>

      <div className="z-10 col-start-2 row-start-1 flex shrink-0 items-center justify-self-end xl:col-start-3">
        <ProfileMenu />
      </div>
    </header>
  )
}
