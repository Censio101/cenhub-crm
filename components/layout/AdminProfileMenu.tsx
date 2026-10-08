"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  LogOutIcon,
  Settings2Icon,
  StoreIcon,
  UserRoundIcon,
} from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useSession } from "@/components/session/SessionProvider"
import { useAdminAccountSettings } from "@/hooks/useAdminAccountSettings"
import { useAdminOrganizationList } from "@/hooks/useAdminOrganizationList"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import {
  clientInitialsFromName,
  formatClientDisplayName,
} from "@/lib/admin/format-client-display-name"
import { clearActiveOrganization } from "@/lib/admin/clear-active-organization"
import { openClientDashboard } from "@/lib/admin/open-client-dashboard"
import { sanitizeStoredProfileImage } from "@/lib/auth/profile-image-sanitize"
import { createClient } from "@/lib/supabase/client"
import {
  isAdminAllClientsNavActive,
  isAdminClientDashboardNavActive,
  isAdminCompanyDetailsNavActive,
  isAdminMyAccountNavActive,
  isAdminWorkspaceNavActive,
  profileMenuActiveItemClassName,
  profileMenuContentClassName,
} from "@/lib/layout/admin-profile-nav-active"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type AdminProfileMenuProps = {
  menuReady: boolean
  sessionLoading: boolean
}

function activeItemProps(active: boolean) {
  return {
    className: cn(active && profileMenuActiveItemClassName),
    "aria-current": active ? ("page" as const) : undefined,
  }
}

export function AdminProfileMenu({ menuReady, sessionLoading }: AdminProfileMenuProps) {
  const { t } = useLanguage()
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const { user } = useSession()
  const { settings: adminSettings } = useAdminAccountSettings()
  const { organization, setActiveOrganization } = useActiveOrganization()
  const { pickerOrganizations, loading: clientListLoading } = useAdminOrganizationList()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openingDashboard, setOpeningDashboard] = useState(false)

  const profilePending = sessionLoading && !user
  const personName =
    user?.fullName?.trim() ||
    adminSettings.displayName.trim() ||
    t("profileMenuAdminFallback")
  const displayName = organization
    ? t("adminSessionIdentity", { name: formatClientDisplayName(organization.name) })
    : personName
  const profileImage =
    sanitizeStoredProfileImage(user?.avatarUrl) ||
    sanitizeStoredProfileImage(adminSettings.profileImage) ||
    null
  const initials = clientInitialsFromName(personName || t("profileMenuAdminFallback"))
  const clientSlug = organization?.slug ?? pickerOrganizations[0]?.slug ?? null
  const canOpenClientDashboard =
    Boolean(clientSlug) || clientListLoading || pickerOrganizations.length > 0

  const workspaceActive = isAdminWorkspaceNavActive(pathname)
  const allClientsActive = isAdminAllClientsNavActive(pathname)
  const dashboardActive = isAdminClientDashboardNavActive(pathname)
  const companyActive = isAdminCompanyDetailsNavActive(pathname)
  const accountActive = isAdminMyAccountNavActive(pathname)

  async function handleOpenClientDashboard() {
    const slug = organization?.slug ?? pickerOrganizations[0]?.slug ?? null
    if (!slug) return
    setMenuOpen(false)
    setOpeningDashboard(true)
    try {
      await openClientDashboard(slug, setActiveOrganization, { router, path: "/" })
    } finally {
      setOpeningDashboard(false)
    }
  }

  return (
    <DropdownMenu
      open={menuOpen}
      onOpenChange={(nextOpen) => {
        if (!menuReady) {
          setMenuOpen(false)
          return
        }
        setMenuOpen(nextOpen)
      }}
    >
      <DropdownMenuTrigger
        aria-busy={!menuReady || undefined}
        aria-label={t("profileMenuAria")}
        render={
          <Button
            variant="ghost"
            className="h-auto min-w-0 gap-3 rounded-full bg-transparent py-1 pr-1 pl-2.5 text-white hover:bg-primary hover:text-white aria-expanded:bg-primary! aria-expanded:text-white! data-popup-open:bg-primary data-popup-open:text-white focus-visible:border-transparent focus-visible:ring-primary/50 sm:pl-3"
          />
        }
      >
        <p className="hidden max-w-52 truncate text-right text-base font-medium text-inherit sm:block">
          {profilePending ? (
            <span className="inline-block h-5 w-24 animate-pulse rounded bg-white/20" aria-hidden="true" />
          ) : (
            displayName
          )}
        </p>
        {profilePending ? (
          <span
            className="size-11 animate-pulse rounded-full bg-white/20 ring-1 ring-white/20"
            aria-hidden="true"
          />
        ) : profileImage ? (
          profileImage.startsWith("data:") || profileImage.startsWith("blob:") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileImage}
              alt=""
              className="size-11 rounded-full object-cover ring-1 ring-white/20"
            />
          ) : (
            <Image
              src={profileImage}
              alt=""
              width={64}
              height={64}
              className="size-11 rounded-full object-cover ring-1 ring-white/20"
              unoptimized
            />
          )
        ) : (
          <span className="flex size-11 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white ring-1 ring-white/20">
            {initials}
          </span>
        )}
        <ChevronDownIcon className="mr-1 hidden size-4 shrink-0 text-white/55 sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={profileMenuContentClassName}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-foreground">
            {menuReady ? (
              displayName
            ) : (
              <span className="inline-block h-4 w-28 animate-pulse rounded bg-muted" aria-hidden="true" />
            )}
          </DropdownMenuLabel>
          {!menuReady ? (
            <DropdownMenuItem disabled className="text-muted-foreground">
              {t("loading")}
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem
                nativeButton={false}
                render={<Link href="/admin/overview" />}
                {...activeItemProps(workspaceActive)}
              >
                <LayoutGridIcon />
                <span className="min-w-0 flex-1">{t("navAdminWorkspace")}</span>
                {workspaceActive ? (
                  <CheckIcon className="ml-auto size-4 shrink-0 opacity-90" aria-hidden="true" />
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                nativeButton={false}
                render={<Link href="/admin/clients" />}
                {...activeItemProps(allClientsActive)}
              >
                <Settings2Icon />
                <span className="min-w-0 flex-1">{t("navAllClients")}</span>
                {allClientsActive ? (
                  <CheckIcon className="ml-auto size-4 shrink-0 opacity-90" aria-hidden="true" />
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canOpenClientDashboard || openingDashboard}
                {...activeItemProps(dashboardActive)}
                onClick={() => {
                  void handleOpenClientDashboard()
                }}
              >
                <LayoutDashboardIcon />
                <span className="min-w-0 flex-1">
                  {openingDashboard ? t("openingDashboard") : t("profileMenuClientDashboard")}
                </span>
                {dashboardActive ? (
                  <CheckIcon className="ml-auto size-4 shrink-0 opacity-90" aria-hidden="true" />
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!clientSlug}
                title={!clientSlug ? t("adminTopbarCompanyDetailsDisabled") : undefined}
                {...activeItemProps(companyActive)}
                onClick={() => {
                  if (!clientSlug) return
                  setMenuOpen(false)
                  void openClientDashboard(clientSlug, setActiveOrganization, {
                    router,
                    path: "/virksomhed",
                  })
                }}
              >
                <StoreIcon />
                <span className="min-w-0 flex-1">{t("adminTopbarCompanyDetails")}</span>
                {companyActive ? (
                  <CheckIcon className="ml-auto size-4 shrink-0 opacity-90" aria-hidden="true" />
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                nativeButton={false}
                render={<Link href="/admin/konto" />}
                {...activeItemProps(accountActive)}
              >
                <UserRoundIcon />
                <span className="min-w-0 flex-1">{t("navMyAccount")}</span>
                {accountActive ? (
                  <CheckIcon className="ml-auto size-4 shrink-0 opacity-90" aria-hidden="true" />
                ) : null}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={!menuReady}
          onClick={() => {
            if (!menuReady) return
            void (async () => {
              await clearActiveOrganization()
              const supabase = createClient()
              await supabase.auth.signOut()
              router.push("/logget-ud")
            })()
          }}
        >
          <LogOutIcon />
          {t("profileMenuSignOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
