"use client"

import { usePathname } from "next/navigation"
import { type ReactNode, useState } from "react"
import {
  ExternalLinkIcon,
  FlaskConicalIcon,
  MegaphoneIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import { useAdminClientPending } from "@/components/admin/use-admin-client-pending"
import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import {
  clientInitialsFromName,
  formatClientDisplayName,
} from "@/lib/admin/format-client-display-name"
import { openClientDashboard } from "@/lib/admin/open-client-dashboard"
import { adminClientSection } from "@/lib/admin/admin-routes"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

const heroWidthClass = "mx-auto w-full max-w-6xl"
const contentWidthClass = "mx-auto w-full max-w-2xl"

function StatCard({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: "neutral" | "success" | "warning" | "brand"
}) {
  return (
    <div className={cn(adminSectionCardClass, "px-4 py-3.5")}>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            tone === "success" && "bg-emerald-50 text-emerald-700",
            tone === "warning" && "bg-amber-50 text-amber-800",
            tone === "brand" && "bg-primary/10 text-primary",
            tone === "neutral" && "bg-[#faf8f6] text-muted-foreground"
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-0.5 truncate text-[15px] font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  )
}

function OverviewSectionsSkeleton() {
  return (
    <div className={cn(contentWidthClass, "grid gap-3 sm:grid-cols-2")}>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-[7.5rem] animate-pulse rounded-2xl bg-muted/80" />
      ))}
    </div>
  )
}

function AdminClientLayoutSkeleton({ isOverview }: { isOverview: boolean }) {
  return (
    <div className="flex w-full flex-col gap-5" aria-busy="true" aria-live="polite">
      {isOverview ? (
        <div className={cn(heroWidthClass, "flex flex-col gap-5")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="size-14 animate-pulse rounded-2xl bg-muted/80" />
              <div className="space-y-2">
                <div className="h-8 w-64 max-w-full animate-pulse rounded-md bg-muted/80" />
                <div className="h-4 w-32 animate-pulse rounded-md bg-muted/80" />
              </div>
            </div>
            <div className="h-10 w-40 animate-pulse rounded-[10px] bg-muted/80" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-muted/80" />
            ))}
          </div>
        </div>
      ) : null}
      {isOverview ? (
        <OverviewSectionsSkeleton />
      ) : (
        <div className={cn(contentWidthClass, "h-80 animate-pulse rounded-2xl bg-muted/80")} />
      )}
    </div>
  )
}

export function AdminClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ""
  const { t } = useLanguage()
  const { setActiveOrganization } = useActiveOrganization()
  const { slug, organization, error, loading } = useAdminClient()
  const { isReady, isSwitching, showSwitchingUI, switchingSlug } = useAdminClientPending()
  const [openingDashboard, setOpeningDashboard] = useState(false)
  const isOverview = adminClientSection(pathname) === "overview"

  if (!organization && !loading && !isSwitching) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-[#d3c3b2] bg-card px-6 py-10 text-center">
        <p className="text-sm text-destructive">{error ?? t("clientNotFound")}</p>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="min-h-[28rem] w-full">
        <p className="sr-only">
          {showSwitchingUI && switchingSlug
            ? t("switchingClient", { name: switchingSlug })
            : t("loadingClient")}
        </p>
        <AdminClientLayoutSkeleton isOverview={isOverview} />
      </div>
    )
  }

  const displayName = formatClientDisplayName(organization!.name)

  return (
    <div className="flex w-full min-h-[28rem] flex-col gap-5">
      {isOverview ? (
        <div className={cn(heroWidthClass, "flex flex-col gap-5")}>
          <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-lg font-semibold tracking-wide text-white"
                aria-hidden="true"
              >
                {clientInitialsFromName(displayName)}
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {displayName}
                </h1>
                <p className="mt-1 font-mono text-sm text-muted-foreground">/{organization!.slug}</p>
              </div>
            </div>
            <Button
              type="button"
              className="h-10 shrink-0 gap-2 px-4"
              disabled={openingDashboard}
              onClick={() => {
                setOpeningDashboard(true)
                void openClientDashboard(slug, setActiveOrganization, { newTab: true }).finally(
                  () => setOpeningDashboard(false)
                )
              }}
            >
              <ExternalLinkIcon className="size-4" aria-hidden="true" />
              {openingDashboard ? t("openingDashboard") : t("openDashboard")}
            </Button>
          </header>

          {error ? (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={<FlaskConicalIcon className="size-[18px]" />}
              label={t("clientStatDemo")}
              value={organization!.demo_mode ? t("demoActive") : t("liveData")}
              tone={organization!.demo_mode ? "warning" : "success"}
            />
            <StatCard
              icon={<MegaphoneIcon className="size-[18px]" />}
              label={t("clientStatMeta")}
              value={organization!.metaEnabled ? t("metaEnabled") : t("metaDisabled")}
              tone={organization!.metaEnabled ? "success" : "neutral"}
            />
            <StatCard
              icon={<UsersIcon className="size-[18px]" />}
              label={t("usersTitle")}
              value={String(organization!.userCount)}
              tone="neutral"
            />
            <StatCard
              icon={<UserPlusIcon className="size-[18px]" />}
              label={t("clientStatLeads")}
              value={String(organization!.leadCount)}
              tone="brand"
            />
          </div>
        </div>
      ) : null}

      <div
        className={isOverview ? cn(contentWidthClass, "max-w-4xl") : contentWidthClass}
      >
        {children}
      </div>
    </div>
  )
}
