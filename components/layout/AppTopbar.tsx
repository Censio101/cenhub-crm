"use client"

import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import {
  Building2Icon,
  ContactRoundIcon,
  EyeIcon,
  LayoutDashboardIcon,
  UsersIcon,
} from "lucide-react"

import { useAccountSettings } from "@/components/account/AccountSettingsProvider"
import { DashboardLocaleSwitcher } from "@/components/i18n/DashboardLocaleSwitcher"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { ProfileMenu } from "@/components/layout/ProfileMenu"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import { CURRENT_COMPANY } from "@/lib/company"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import { isClientManagePath } from "@/lib/admin/admin-routes"
import {
  isAdminPath,
  isClientDashboardPath,
  isClientPickerPath,
  isGuestShellPath,
  isPublicSignupPath,
} from "@/lib/layout/app-paths"
import { cn } from "cn"

const CLIENT_NAV = [
  { href: "/", labelKey: "navDashboard" as const, icon: LayoutDashboardIcon },
  { href: "/overblik", labelKey: "navOverview" as const, icon: EyeIcon },
  { href: "/leads", labelKey: "navLeads" as const, icon: ContactRoundIcon },
  { href: "/kunder", labelKey: "navCustomers" as const, icon: UsersIcon },
] as const

const ADMIN_CLIENT_NAV = [
  { href: "/klienter", labelKey: "selectClient" as const, icon: Building2Icon },
] as const

const censioLogoClass = "h-9 w-auto shrink-0 sm:h-10"

function AppTopbarFallback() {
  return (
    <header className="relative sticky top-0 z-40 grid min-h-[4.5rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 bg-[#0a0a0a] bg-[linear-gradient(90deg,#8f3608_0%,#5c2206_42%,#140c08_76%,#0a0a0a_100%)] px-4 py-2 sm:px-6 lg:px-8 xl:min-h-[4.5rem]">
      <div className="col-start-1 row-start-1 flex min-w-0 items-center">
        <Image
          src="/censio-logo-white.png"
          alt="Censio"
          width={1024}
          height={251}
          className={censioLogoClass}
          priority
        />
      </div>
      <div className="col-start-2 row-start-1 h-9 w-9 animate-pulse rounded-full bg-white/10" />
    </header>
  )
}

function AppTopbarContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const dashboardFilterQuery =
    isClientDashboardPath(pathname) && searchParams.toString()
      ? `?${searchParams.toString()}`
      : ""
  const { t } = useLanguage()
  const { settings } = useAccountSettings()
  const { organization, role, loading: orgLoading } = useActiveOrganization()
  const { configured, isAuthenticated, loading: authLoading } = useSupabaseSession()

  const sessionReady = !orgLoading && !authLoading
  const signedIn = configured ? isAuthenticated : false
  const isAdmin = role === "censio_admin"
  const guestShell = isGuestShellPath(pathname)
  const minimalHeader = guestShell
  const onAdminPath = isAdminPath(pathname)
  const onClientDashboard = isClientDashboardPath(pathname)
  const adminViewingClientDashboard =
    sessionReady && isAdmin && organization !== null && onClientDashboard
  const showClientBranding =
    sessionReady &&
    !minimalHeader &&
    organization !== null &&
    (!isAdmin || adminViewingClientDashboard)
  const clientName = organization
    ? formatClientDisplayName(organization.name)
    : CURRENT_COMPANY.name
  const navItems = guestShell || !sessionReady || !signedIn
    ? []
    : onAdminPath
    ? []
    : isAdmin
      ? adminViewingClientDashboard
        ? [
            ...ADMIN_CLIENT_NAV.map((item) => ({
              href: item.href,
              label: t(item.labelKey),
              icon: item.icon,
            })),
            ...CLIENT_NAV.map((item) => ({
              href: item.href,
              label: t(item.labelKey),
              icon: item.icon,
            })),
          ]
        : [{ href: "/klienter", label: t("selectClient"), icon: Building2Icon }]
      : CLIENT_NAV.map((item) => ({
          href: item.href,
          label: t(item.labelKey),
          icon: item.icon,
        }))
  const homeHref = isPublicSignupPath(pathname)
    ? "/tilmelding"
    : guestShell
      ? "/login"
      : isAdmin && isClientManagePath(pathname)
        ? "/admin/clients"
        : isAdmin && onAdminPath
          ? "/admin"
          : isAdmin && (!organization || isClientPickerPath(pathname))
          ? "/klienter"
          : "/"

  return (
    <header
      className={cn(
        "relative sticky top-0 z-40 grid min-h-[4.5rem] w-full max-w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 overflow-x-clip bg-[#0a0a0a] bg-[linear-gradient(90deg,#8f3608_0%,#5c2206_42%,#140c08_76%,#0a0a0a_100%)] px-4 py-2 font-sans sm:gap-x-3 sm:px-6 lg:px-8",
        navItems.length > 0
          ? "xl:min-h-20 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_auto] xl:py-0"
          : "xl:min-h-[4.5rem] xl:grid-cols-[minmax(0,1fr)_auto] xl:py-2"
      )}
    >
      <div
        className={cn(
          "z-10 col-start-1 row-start-1 flex min-w-0 items-center justify-self-start",
          minimalHeader ? "max-w-none" : "max-w-full xl:max-w-[min(280px,35%)]"
        )}
      >
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
            className={censioLogoClass}
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

      {navItems.length > 0 ? (
        <nav
          className="z-10 col-span-2 row-start-2 flex min-w-0 w-full max-w-full items-center justify-start gap-0.5 overflow-x-auto [scrollbar-width:none] sm:gap-2 sm:justify-center xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:justify-center [&::-webkit-scrollbar]:hidden"
          aria-label="Hovedmenu"
        >
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/klienter"
                  ? isClientPickerPath(pathname)
                  : pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={
                  item.href === "/klienter"
                    ? item.href
                    : `${item.href}${dashboardFilterQuery}`
                }
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
      ) : null}

      <div className="z-10 col-start-2 row-start-1 flex shrink-0 items-center gap-2 justify-self-end xl:col-start-3">
        {adminViewingClientDashboard ? <DashboardLocaleSwitcher /> : null}
        <ProfileMenu />
      </div>
    </header>
  )
}

export function AppTopbar() {
  return (
    <Suspense fallback={<AppTopbarFallback />}>
      <AppTopbarContent />
    </Suspense>
  )
}
