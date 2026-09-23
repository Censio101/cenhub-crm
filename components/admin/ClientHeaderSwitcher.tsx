"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ChevronDownIcon } from "lucide-react"

import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { cn } from "cn"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type OrganizationOption = {
  id: string
  slug: string
  name: string
}

export function ClientHeaderSwitcher() {
  const router = useRouter()
  const { organization, setActiveOrganization } = useActiveOrganization()
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

  if (!organization) return null

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
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Skift klient: ${organization.name}`}
        className={cn(
          "inline-flex max-w-[11rem] items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-base font-medium whitespace-nowrap text-white/70 transition-colors",
          "hover:border-primary hover:text-white focus-visible:ring-3 focus-visible:ring-white/40 focus-visible:outline-none",
          "data-popup-open:border-primary data-popup-open:text-white"
        )}
      >
        <span className="truncate">{organization.name}</span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-70" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="max-h-80 min-w-56 overflow-y-auto">
        {organizations.map((option) => (
          <DropdownMenuItem
            key={option.id}
            disabled={switchingSlug !== null}
            onClick={() => {
              void handleSelect(option.slug)
            }}
            className={cn(option.slug === organization.slug && "font-semibold")}
          >
            {option.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
