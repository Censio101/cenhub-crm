"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

type OrganizationOption = {
  id: string
  slug: string
  name: string
}

function clientInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function ClientContextBar() {
  const router = useRouter()
  const { t } = useLanguage()
  const { organization, role, setActiveOrganization } = useActiveOrganization()
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [switchingSlug, setSwitchingSlug] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadOrganizations() {
      try {
        const response = await fetch("/api/admin/organizations", { cache: "no-store" })
        if (!response.ok || cancelled) return
        const data = (await response.json()) as { organizations: OrganizationOption[] }
        if (!cancelled) setOrganizations(data.organizations)
      } catch {
        // Keep the current client visible if the list fails to load.
      }
    }

    void loadOrganizations()

    return () => {
      cancelled = true
    }
  }, [])

  if (role !== "censio_admin" || !organization) return null

  async function handleSelect(slug: string) {
    if (slug === organization?.slug || switchingSlug) return
    setSwitchingSlug(slug)
    try {
      const success = await setActiveOrganization(slug)
      if (success) router.refresh()
    } finally {
      setSwitchingSlug(null)
    }
  }

  return (
    <div className={cn("admin-ui", outfit.className, "border-b border-[#d3c3b2] bg-[#faf8f6]")}>
      <div className="flex items-center justify-end gap-3 px-4 py-2.5 sm:px-6 lg:px-8 xl:px-10">
        <span className="shrink-0 text-sm font-medium text-muted-foreground">
          {t("viewingClient")}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${t("switchClient")}: ${organization.name}`}
            className={cn(
              "inline-flex min-w-0 max-w-full items-center gap-2.5 rounded-full border border-[#d3c3b2] bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors",
              "hover:border-primary/40 hover:bg-white focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none",
              "data-popup-open:border-primary/40 data-popup-open:ring-3 data-popup-open:ring-primary/20"
            )}
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-xs font-semibold tracking-wide text-white"
              aria-hidden="true"
            >
              {clientInitials(organization.name)}
            </span>
            <span className="truncate">{organization.name}</span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn("admin-ui", outfit.className, "max-h-80 min-w-56 overflow-y-auto")}
          >
            {organizations.map((option) => {
              const isActive = option.slug === organization.slug
              return (
                <DropdownMenuItem
                  key={option.id}
                  disabled={switchingSlug !== null}
                  onClick={() => {
                    void handleSelect(option.slug)
                  }}
                  className="flex items-center gap-2 py-2"
                >
                  <CheckIcon
                    className={cn(
                      "size-4 shrink-0 text-primary",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn("min-w-0 flex-1 truncate", isActive && "font-semibold")}>
                    {option.name}
                  </span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
