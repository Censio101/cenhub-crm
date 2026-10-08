"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import {
  Building2Icon,
  CheckIcon,
  ChevronDownIcon,
  LogOutIcon,
  UserRoundIcon,
} from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useSession } from "@/components/session/SessionProvider"
import { clientInitialsFromName } from "@/lib/admin/format-client-display-name"
import { clearClientCaches } from "@/lib/data/client-cache"
import {
  profileMenuActiveItemClassName,
  profileMenuContentClassName,
} from "@/lib/layout/admin-profile-nav-active"
import { createClient } from "@/lib/supabase/client"
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

type ClientProfileMenuProps = {
  menuReady: boolean
  sessionLoading: boolean
}

function clientDisplayName(fullName: string | null, email: string | null) {
  const trimmed = fullName?.trim()
  if (trimmed) return trimmed
  const mail = email?.trim()
  if (mail) {
    const local = mail.split("@")[0]
    if (local) return local
  }
  return "?"
}

export function ClientProfileMenu({ menuReady, sessionLoading }: ClientProfileMenuProps) {
  const { t } = useLanguage()
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const companyActive = pathname === "/virksomhed" || pathname.startsWith("/virksomhed/")
  const accountActive = pathname === "/konto" || pathname.startsWith("/konto/")
  const { user } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = clientDisplayName(user?.fullName ?? null, user?.email ?? null)
  const initials = clientInitialsFromName(displayName)
  const avatarUrl = user?.avatarUrl?.trim() || null

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
          {sessionLoading ? (
            <span className="inline-block h-5 w-24 animate-pulse rounded bg-white/20" aria-hidden="true" />
          ) : (
            displayName
          )}
        </p>
        {avatarUrl ? (
          avatarUrl.startsWith("data:") || avatarUrl.startsWith("blob:") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="size-11 rounded-full object-cover ring-1 ring-white/20"
            />
          ) : (
            <Image
              src={avatarUrl}
              alt=""
              width={64}
              height={64}
              className="size-11 rounded-full object-cover ring-1 ring-white/20"
              unoptimized
            />
          )
        ) : (
          <span
            className="flex size-11 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white ring-1 ring-white/20"
            aria-hidden="true"
          >
            {initials}
          </span>
        )}
        <ChevronDownIcon className="mr-1 hidden size-4 shrink-0 text-white/55 sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={profileMenuContentClassName}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-foreground">
            {menuReady && user ? (
              <div className="flex items-center gap-3 py-0.5">
                {avatarUrl ? (
                  avatarUrl.startsWith("data:") || avatarUrl.startsWith("blob:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt=""
                      className="size-10 rounded-full object-cover"
                    />
                  ) : (
                    <Image
                      src={avatarUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 rounded-full object-cover"
                      unoptimized
                    />
                  )
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{displayName}</p>
                  {user.email ? (
                    <p className="truncate text-xs font-normal text-muted-foreground">
                      {user.email}
                    </p>
                  ) : null}
                </div>
              </div>
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
                render={<Link href="/virksomhed" />}
                className={cn(companyActive && profileMenuActiveItemClassName)}
                aria-current={companyActive ? "page" : undefined}
              >
                <Building2Icon />
                <span className="min-w-0 flex-1">{t("clientMenuCompanyDetails")}</span>
                {companyActive ? (
                  <CheckIcon className="ml-auto size-4 shrink-0 opacity-90" aria-hidden="true" />
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                nativeButton={false}
                render={<Link href="/konto" />}
                className={cn(accountActive && profileMenuActiveItemClassName)}
                aria-current={accountActive ? "page" : undefined}
              >
                <UserRoundIcon />
                <span className="min-w-0 flex-1">{t("clientMenuMySettings")}</span>
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
              const supabase = createClient()
              await supabase.auth.signOut()
              clearClientCaches()
              router.replace("/logget-ud")
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
