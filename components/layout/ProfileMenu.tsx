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
} from "lucide-react"

import { ClientSwitcher } from "@/components/admin/ClientSwitcher"
import { useAccountSettings } from "@/components/account/AccountSettingsProvider"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { useUserProfile } from "@/lib/auth/use-user-profile"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"
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
  const pathname = usePathname()
  const router = useRouter()
  const { settings } = useAccountSettings()
  const { configured, isAuthenticated, loading } = useSupabaseSession()
  const { role } = useUserProfile()
  const { organization, role: activeRole, loading: orgLoading } =
    useActiveOrganization()
  const [mockSignedIn, setMockSignedIn] = useState(true)

  useEffect(() => {
    if (!configured) {
      setMockSignedIn(isSignedIn())
    }
  }, [configured, pathname])

  const signedIn = configured ? isAuthenticated : mockSignedIn
  const isAdmin = (activeRole ?? role) === "censio_admin"
  const displayName =
    organization?.name ?? (isAdmin ? "Censio Admin" : CURRENT_COMPANY.name)

  if (!loading && !signedIn) {
    return (
      <Link
        href="/login"
        className="rounded-lg px-3 py-2 text-base font-medium text-white transition-colors hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/40 focus-visible:outline-none"
      >
        Log ind
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Profilmenu"
        render={
          <Button
            variant="ghost"
            className="h-auto min-w-0 gap-3 rounded-full bg-transparent py-1 pr-1 pl-2.5 text-white hover:bg-primary hover:text-white aria-expanded:bg-primary! aria-expanded:text-white! data-popup-open:bg-primary data-popup-open:text-white focus-visible:border-transparent focus-visible:ring-primary/50 sm:pl-3"
          />
        }
      >
        <p className="hidden max-w-52 truncate text-right text-base font-medium text-inherit sm:block">
          {orgLoading ? CURRENT_COMPANY.name : displayName}
        </p>
        {settings.profileImage.startsWith("data:") ||
        settings.profileImage.startsWith("blob:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.profileImage}
            alt=""
            className="size-11 rounded-full object-cover ring-1 ring-white/20"
          />
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
          {isAdmin ? (
            <>
              <div className="px-2 py-2">
                <ClientSwitcher variant="compact" />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem nativeButton={false} render={<Link href="/admin" />}>
                <ShieldIcon />
                Admin
              </DropdownMenuItem>
              <DropdownMenuItem nativeButton={false} render={<Link href="/admin/meta" />}>
                <ShieldIcon />
                Meta klienter
              </DropdownMenuItem>
              <DropdownMenuItem nativeButton={false} render={<Link href="/admin/settings" />}>
                <SettingsIcon />
                Admin indstillinger
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuItem
            nativeButton={false}
            render={<Link href="/indstillinger" />}
          >
            <SettingsIcon />
            Indstillinger
          </DropdownMenuItem>
          <DropdownMenuItem
            nativeButton={false}
            render={<Link href="/onboarding" />}
          >
            <GraduationCapIcon />
            Onboarding
          </DropdownMenuItem>
          <DropdownMenuItem
            nativeButton={false}
            render={<Link href="/kontakt" />}
          >
            <MessageCircleIcon />
            Kontakt Censio
          </DropdownMenuItem>
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
          Log ud
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
