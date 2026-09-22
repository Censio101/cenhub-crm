"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Building2Icon } from "lucide-react"

import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "cn"

type OrganizationOption = {
  id: string
  slug: string
  name: string
}

type ClientSwitcherProps = {
  variant?: "default" | "compact" | "topbar"
  className?: string
}

export function ClientSwitcher({
  variant = "default",
  className,
}: ClientSwitcherProps) {
  const router = useRouter()
  const { organization, role, loading: orgLoading, setActiveOrganization } =
    useActiveOrganization()
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [switching, setSwitching] = useState(false)

  const isAdmin = role === "censio_admin"

  const loadOrganizations = useCallback(async () => {
    if (!isAdmin) return
    setLoadingOrgs(true)
    try {
      const response = await fetch("/api/admin/organizations", { cache: "no-store" })
      if (!response.ok) return
      const data = (await response.json()) as {
        organizations: OrganizationOption[]
      }
      setOrganizations(
        [...data.organizations].sort((a, b) => a.name.localeCompare(b.name, "da"))
      )
    } finally {
      setLoadingOrgs(false)
    }
  }, [isAdmin])

  useEffect(() => {
    void loadOrganizations()
  }, [loadOrganizations])

  if (!isAdmin || orgLoading) return null

  const currentSlug = organization?.slug ?? ""
  const placeholder = loadingOrgs ? "Henter klienter…" : "Vælg klient"

  async function handleChange(nextSlug: string | null) {
    if (!nextSlug || nextSlug === currentSlug) return
    setSwitching(true)
    try {
      const success = await setActiveOrganization(nextSlug)
      if (success) {
        router.refresh()
      }
    } finally {
      setSwitching(false)
    }
  }

  const triggerClass =
    variant === "topbar"
      ? "h-9 min-w-[10rem] max-w-[14rem] border-white/20 bg-white/10 text-sm text-white hover:bg-white/15"
      : variant === "compact"
        ? "h-8 min-w-[9rem] max-w-[12rem] text-xs"
        : "h-9 w-full min-w-0 text-sm"

  return (
    <div className={cn("min-w-0", className)}>
      {variant === "default" ? (
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Building2Icon className="size-3.5" aria-hidden="true" />
          Aktiv klient
        </p>
      ) : null}
      <Select
        value={currentSlug || null}
        onValueChange={(value) => {
          void handleChange(value)
        }}
        disabled={loadingOrgs || switching}
      >
        <SelectTrigger
          className={triggerClass}
          aria-label="Vælg klient"
          size={variant === "compact" ? "sm" : "default"}
        >
          <SelectValue placeholder={placeholder}>
            {organization?.name ?? placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align={variant === "topbar" ? "end" : "start"}>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.slug}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export async function openClientDashboard(
  slug: string,
  setActiveOrganization: (slug: string | null) => Promise<boolean>,
  router: ReturnType<typeof useRouter>
) {
  const success = await setActiveOrganization(slug)
  if (success) {
    router.push("/overblik")
    router.refresh()
  }
  return success
}
