"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ChevronDownIcon,
  GraduationCapIcon,
  LogOutIcon,
  MessageCircleIcon,
  SettingsIcon,
  ShieldIcon,
  UserRoundIcon,
} from "lucide-react"

import { useAccountSettings } from "@/components/account/AccountSettingsProvider"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAdminAccountSettings } from "@/hooks/useAdminAccountSettings"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { useUserProfile } from "@/lib/auth/use-user-profile"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import { CURRENT_COMPANY } from "@/lib/company"
import { createClient } from "@/lib/supabase/client"
import { isSignedIn, signOut as mockSignOut } from "@/lib/session"
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

export function ProfileMenu() {
  const { t } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  const { settings } = useAccountSettings()
  const { settings: adminSettings } = useAdminAccountSettings()
  const { configured, isAuthenticated, loading } = useSupabaseSession()
  const { role, loading: profileLoading } = useUserProfile()
  const { organization, role: activeRole, loading: orgLoading } =
    useActiveOrganization()
  const sessionLoading = orgLoading || profileLoading
  const resolvedRole = activeRole ?? role
  const [mockSignedIn, setMockSignedIn] = useState(true)

  useEffect(() => {
    if (!configured) {
      setMockSignedIn(isSignedIn())
    }
  }, [configured, pathname])

  const signedIn = configured ? isAuthenticated : mockSignedIn
  const isAdmin = resolvedRole === "censio_admin"
  const savedName = (isAdmin ? adminSettings.displayName : settings.displayName)
    ?.trim() ?? ""
  const displayName = sessionLoading
    ? ""
    : savedName
      ? savedName
      : isAdmin
        ? t("profileMenuAdminFallback")
        : (organization?.name ?? CURRENT_COMPANY.name)
  const profileImage = isAdmin
    ? adminSettings.profileImage.trim() || null
    : settings.profileImage

  if (!loading && !signedIn) {
    return (
      <Link
        href="/login"
        className="rounded-lg px-3 py-2 text-base font-medium text-white transition-colors hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/40 focus-visible:outline-none"
      >
        {t("loginSubmit")}
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("profileMenuAria")}
        render={
          <Button
            variant="ghost"
            className="h-auto min-w-0 gap-3 rounded-full bg-transparent py-1 pr-1 pl-2.5 text-white hover:bg-primary hover:text-white aria-expanded:bg-primary! aria-expanded:text-white! data-popup-open:bg-primary data-popup-open:text-white focus-visible:border-transparent focus-visible:ring-primary/50 sm:pl-3"
          />
        }
      >
        <p className="hidden max-w-52 truncate text-right text-base font-medium text-inherit sm:block">
          {sessionLoading ? (
            <span className="inline-block h-5 w-24 animate-pulse rounded bg-white/20" aria-hidden="true" />
          ) : (
            displayName
          )}
        </p>
        {profileImage ? (
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
        ) : isAdmin ? (
          <span className="flex size-11 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            <UserRoundIcon className="size-6 text-white/80" aria-hidden="true" />
          </span>
        ) : (
          <Image
            src={settings.profileImage}
            alt=""
            width={64}
            height={64}
            className="size-11 rounded-full object-cover ring-1 ring-white/20"
          />
        )}
        <ChevronDownIcon className="mr-1 hidden size-4 shrink-0 text-white/55 sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-56 w-56 [&_[data-slot=dropdown-menu-item]]:focus:bg-primary [&_[data-slot=dropdown-menu-item]]:focus:text-white [&_[data-slot=dropdown-menu-item]]:focus:[&_svg]:text-white [&_[data-slot=dropdown-menu-item][data-variant=destructive]]:focus:bg-primary [&_[data-slot=dropdown-menu-item][data-variant=destructive]]:focus:text-white"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-foreground">
            {displayName}
          </DropdownMenuLabel>
          {isAdmin && organization ? (
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {formatClientDisplayName(organization.name)}
            </DropdownMenuLabel>
          ) : null}
          {isAdmin ? (
            <>
              <DropdownMenuItem nativeButton={false} render={<Link href="/admin" />}>
                <ShieldIcon />
                {t("allClients")}
              </DropdownMenuItem>
              <DropdownMenuItem nativeButton={false} render={<Link href="/admin/settings" />}>
                <SettingsIcon />
                {t("navSettings")}
              </DropdownMenuItem>
              <DropdownMenuItem nativeButton={false} render={<Link href="/admin/konto" />}>
                <UserRoundIcon />
                {t("navMyAccount")}
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem
                nativeButton={false}
                render={<Link href="/indstillinger" />}
              >
                <SettingsIcon />
                {t("profileMenuSettings")}
              </DropdownMenuItem>
              <DropdownMenuItem
                nativeButton={false}
                render={<Link href="/onboarding" />}
              >
                <GraduationCapIcon />
                {t("profileMenuOnboarding")}
              </DropdownMenuItem>
              <DropdownMenuItem
                nativeButton={false}
                render={<Link href="/kontakt" />}
              >
                <MessageCircleIcon />
                {t("profileMenuContact")}
              </DropdownMenuItem>
              <DropdownMenuItem nativeButton={false} render={<Link href="/konto" />}>
                <UserRoundIcon />
                {t("navMyAccount")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            void (async () => {
              if (configured) {
                const supabase = createClient()
                await supabase.auth.signOut()
              } else {
                mockSignOut()
                setMockSignedIn(false)
              }
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
