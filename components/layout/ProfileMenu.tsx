"use client"

import Link from "next/link"
import { LogOutIcon, SettingsIcon } from "lucide-react"

import { useAccountSettings } from "@/components/account/AccountSettingsProvider"
import { logoutToLogin } from "@/lib/session"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ProfileMenu() {
  const { user } = useAccountSettings()
  const name = user?.name || "Kaj Eli Joensen"
  const title = user?.title ?? "CEO & Founder"
  const image = user?.profileImage || "/kaj-eli-joensen.jpg"

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
        <span className="hidden max-w-52 text-right sm:block">
          <span className="block truncate text-base font-medium text-inherit">{name}</span>
          <span className="block truncate text-xs font-normal italic text-white/70">
            {title}
          </span>
        </span>
        <img
          src={image}
          alt=""
          className={`size-11 rounded-full object-cover ring-1 ring-white/20 ${image.includes("kaj-eli-joensen") ? "object-[center_30%]" : "object-center"}`}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-56 w-56 [&_[data-slot=dropdown-menu-item]]:focus:bg-primary [&_[data-slot=dropdown-menu-item]]:focus:text-white [&_[data-slot=dropdown-menu-item]]:focus:[&_svg]:text-white"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-foreground">{name}</DropdownMenuLabel>
          <DropdownMenuItem nativeButton={false} render={<Link href="/indstillinger" />}>
            <SettingsIcon />
            Indstillinger
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              void logoutToLogin()
            }}
          >
            <LogOutIcon />
            Log ud
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
