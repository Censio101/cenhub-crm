"use client"

import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import { usePathname } from "next/navigation"
import { ContactRoundIcon, LayoutDashboardIcon, UsersIcon } from "lucide-react"

import { ClientLogoMark } from "@/components/organization/ClientLogoMark"
import { DashboardLocaleSwitcher } from "@/components/i18n/DashboardLocaleSwitcher"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { AdminHeaderNav } from "@/components/layout/AdminHeaderNav"
import {
  AppTopbarNavLinks,
  AppTopbarNavSkeleton,
} from "@/components/layout/AppTopbarNavLinks"
import { ProfileMenu } from "@/components/layout/ProfileMenu"
import { ProfileMenuSkeleton } from "@/components/layout/ProfileMenuSkeleton"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { useAdminClientPickerGate } from "@/hooks/useAdminClientPickerGate"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import { isClientManagePath } from "@/lib/admin/admin-routes"
import {
  isAdminPath,
  isClientDashboardPath,
  isClientPickerPath,
} from "@/lib/layout/app-paths"
import { cn } from "cn"

const CLIENT_NAV = [
  { href: "/", labelKey: "navDashboard" as const, icon: LayoutDashboardIcon },
  { href: "/leads", labelKey: "navLeads" as const, icon: ContactRoundIcon },
  { href: "/kunder", labelKey: "navCustomers" as const, icon: UsersIcon },
] as const

const censioLogoClass =
  "h-8 w-[calc(2rem*1024/251)] max-w-none shrink-0 object-contain aspect-[1024/251] sm:h-9 sm:w-[calc(2.25rem*1024/251)]"

export function AppTopbarShell() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { organization, role, loading: orgLoading } = useActiveOrganization()
  const { mustPickClient, resolvingActiveClient, useAdminShell, isClientRole } =
    useAdminClientPickerGate()
  const { configured, isAuthenticated, loading: authLoading } = useSupabaseSession()

  const sessionReady = !orgLoading && !authLoading
  const signedIn = configured ? isAuthenticated : false
  const isAdmin = role === "censio_admin" || useAdminShell
  const onAdminPath = isAdminPath(pathname)
  const onClientDashboard = isClientDashboardPath(pathname)

  const adminViewingClientDashboard =
    sessionReady &&
    isAdmin &&
    organization !== null &&
    !mustPickClient &&
    onClientDashboard

  const showClientBranding =
    sessionReady &&
    organization !== null &&
    !mustPickClient &&
    !resolvingActiveClient &&
    (!isAdmin || adminViewingClientDashboard)

  const clientName = organization ? formatClientDisplayName(organization.name) : null
  const clientLogoSrc = organization?.logoUrl ?? null

  const showClientDashboardNav =
    !mustPickClient &&
    !resolvingActiveClient &&
    (isClientRole || (role === "censio_admin" && organization !== null))

  const navItems =
    !sessionReady || !signedIn || onAdminPath
      ? []
      : showClientDashboardNav
        ? CLIENT_NAV.map((item) => ({
            href: item.href,
            label: t(item.labelKey),
            icon: item.icon,
          }))
        : []

  const reserveDashboardNav =
    onClientDashboard &&
    configured &&
    (authLoading || isAuthenticated) &&
    !mustPickClient &&
    !resolvingActiveClient &&
    !useAdminShell

  const showAdminHeaderNav = sessionReady && signedIn && useAdminShell

  const showNavRow =
    navItems.length > 0 ||
    (reserveDashboardNav && !sessionReady) ||
    showAdminHeaderNav

  const homeHref = isAdmin && isClientManagePath(pathname)
    ? "/admin/clients"
    : isAdmin && onAdminPath
      ? "/admin/overview"
      : "/"

  return (
    <header
      className={cn(
        "relative sticky top-0 z-40 grid min-h-[4.5rem] w-full max-w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 overflow-x-clip bg-[#0a0a0a] bg-[linear-gradient(90deg,#8f3608_0%,#5c2206_42%,#140c08_76%,#0a0a0a_100%)] px-4 py-2 font-sans sm:gap-x-3 sm:px-6 lg:px-8",
        showNavRow
          ? "xl:min-h-20 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_auto] xl:py-0"
          : "xl:min-h-[4.5rem] xl:grid-cols-[minmax(0,1fr)_auto] xl:py-2"
      )}
    >
      <div className="z-10 col-start-1 row-start-1 flex min-w-0 max-w-full items-center justify-self-start xl:max-w-[min(280px,35%)]">
        <Link
          href={homeHref}
          className="flex min-w-0 items-center gap-3.5 sm:gap-4"
          aria-label={showClientBranding ? `Censio × ${clientName}` : "Censio"}
        >
          <Image
            src="/censio-logo-white.png"
            alt="Censio"
            width={1024}
            height={251}
            className={censioLogoClass}
            priority
          />
          {showClientBranding && clientLogoSrc ? (
            <>
              <span
                className="select-none text-sm font-light leading-none text-white/45 sm:text-base"
                aria-hidden="true"
              >
                ×
              </span>
              <ClientLogoMark
                src={clientLogoSrc}
                alt={clientName ?? ""}
                background={organization?.logoBackground ?? "transparent"}
              />
            </>
          ) : null}
        </Link>
      </div>

      {showNavRow ? (
        <nav
          className="z-10 col-span-2 row-start-2 flex min-w-0 w-full max-w-full items-center justify-start gap-0.5 overflow-x-auto [scrollbar-width:none] sm:gap-2 sm:justify-center xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:justify-center [&::-webkit-scrollbar]:hidden"
          aria-label={t("navMainAria")}
        >
          {showAdminHeaderNav ? <AdminHeaderNav /> : null}
          {showAdminHeaderNav && navItems.length > 0 ? (
            <span
              className="mx-1 hidden h-6 w-px shrink-0 bg-white/25 md:inline"
              aria-hidden="true"
            />
          ) : null}
          {navItems.length > 0 ? (
            <Suspense fallback={<AppTopbarNavSkeleton />}>
              <AppTopbarNavLinks pathname={pathname} items={navItems} />
            </Suspense>
          ) : showAdminHeaderNav ? null : (
            <AppTopbarNavSkeleton />
          )}
        </nav>
      ) : null}

      <div className="z-10 col-start-2 row-start-1 flex shrink-0 items-center gap-2 justify-self-end xl:col-start-3">
        {sessionReady &&
        signedIn &&
        onClientDashboard &&
        !isClientPickerPath(pathname) ? (
          <DashboardLocaleSwitcher />
        ) : null}
        {authLoading ||
        (configured && !signedIn) ||
        (signedIn && role === null && (orgLoading || authLoading)) ? (
          <ProfileMenuSkeleton />
        ) : (
          <ProfileMenu />
        )}
      </div>
    </header>
  )
}
