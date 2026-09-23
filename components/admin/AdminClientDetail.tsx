"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState, type ReactNode } from "react"

import { openClientDashboard } from "@/lib/admin/open-client-dashboard"
import { AdminInviteUserForm } from "@/components/admin/AdminInviteUserForm"
import {
  AdminMetaConfigForm,
  type MetaConfig,
} from "@/components/admin/AdminMetaConfigForm"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ProfileRow } from "@/lib/db/types"
import { cn } from "cn"

type OrganizationSummary = {
  id: string
  slug: string
  name: string
  demo_mode: boolean
  leadCount: number
  userCount: number
  metaEnabled: boolean
}

function AdminClientDetailSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="h-3 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-64 max-w-full animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
          <div className="flex flex-wrap gap-2 pt-1">
            <div className="h-7 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-7 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-7 w-24 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
        <div className="h-10 w-40 animate-pulse rounded-[10px] bg-muted" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-3">
          <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted" />
        </div>
        <div className="mt-5 grid gap-4">
          <div className="h-10 animate-pulse rounded-[15px] bg-muted" />
          <div className="h-10 animate-pulse rounded-[15px] bg-muted" />
          <div className="h-10 animate-pulse rounded-[15px] bg-muted" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="h-5 w-24 animate-pulse rounded-md bg-muted" />
        <div className="mt-4 h-10 w-36 animate-pulse rounded-[10px] bg-muted" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
        <div className="mt-5 space-y-3">
          <div className="h-10 animate-pulse rounded-[15px] bg-muted" />
          <div className="h-10 animate-pulse rounded-[15px] bg-muted" />
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="h-5 w-24 animate-pulse rounded-md bg-muted" />
        <div className="mt-5 space-y-2">
          <div className="h-12 animate-pulse rounded-[15px] bg-muted" />
          <div className="h-12 animate-pulse rounded-[15px] bg-muted" />
        </div>
      </div>
    </div>
  )
}

function StatPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "neutral" | "success" | "warning"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "success" && "bg-emerald-50 text-emerald-700",
        tone === "warning" && "bg-primary/10 text-primary",
        tone === "neutral" && "bg-muted text-muted-foreground"
      )}
    >
      {children}
    </span>
  )
}

export function AdminClientDetail({ slug }: { slug: string }) {
  const router = useRouter()
  const { t } = useLanguage()
  const { setActiveOrganization } = useActiveOrganization()
  const [organization, setOrganization] = useState<OrganizationSummary | null>(null)
  const [users, setUsers] = useState<ProfileRow[]>([])
  const [metaConfig, setMetaConfig] = useState<MetaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingDemo, setSavingDemo] = useState(false)
  const [openingDashboard, setOpeningDashboard] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [orgResponse, usersResponse, metaResponse] = await Promise.all([
        fetch(`/api/admin/organizations/${slug}`, { cache: "no-store" }),
        fetch(`/api/admin/organizations/${slug}/users`, { cache: "no-store" }),
        fetch(`/api/admin/organizations/${slug}/meta`, { cache: "no-store" }),
      ])

      if (!orgResponse.ok) throw new Error(t("clientNotFound"))

      const orgData = (await orgResponse.json()) as { organization: OrganizationSummary }
      setOrganization(orgData.organization)

      if (usersResponse.ok) {
        const usersData = (await usersResponse.json()) as { users: ProfileRow[] }
        setUsers(usersData.users)
      } else {
        setUsers([])
      }

      if (metaResponse.ok) {
        const metaData = (await metaResponse.json()) as {
          config?: MetaConfig & { organizationId?: string }
        }
        setMetaConfig(
          metaData.config
            ? {
                metaAdAccountId: metaData.config.metaAdAccountId ?? "",
                metaPageId: metaData.config.metaPageId ?? "",
                metaPixelId: metaData.config.metaPixelId ?? "",
                enabled: Boolean(metaData.config.enabled),
                metaSyncStatus: metaData.config.metaSyncStatus ?? "disabled",
                metaSyncError: metaData.config.metaSyncError ?? null,
                metaLastSyncedAt: metaData.config.metaLastSyncedAt ?? null,
              }
            : null
        )
      } else {
        setMetaConfig(null)
      }
    } catch (loadError) {
      setOrganization(null)
      setError(loadError instanceof Error ? loadError.message : t("errorLoadClient"))
    } finally {
      setLoading(false)
    }
  }, [slug, t])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleDemoMode() {
    if (!organization) return
    setSavingDemo(true)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoMode: !organization.demo_mode }),
      })
      if (!response.ok) throw new Error(t("errorUpdateDemo"))
      await load()
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : t("errorUpdateDemo")
      )
    } finally {
      setSavingDemo(false)
    }
  }

  if (loading) {
    return (
      <>
        <p className="sr-only">{t("loadingClient")}</p>
        <AdminClientDetailSkeleton />
      </>
    )
  }

  if (!organization) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-[#d3c3b2] bg-card px-6 py-10 text-center">
        <p className="text-sm text-destructive">{error ?? t("clientNotFound")}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
            {t("clientSettingsLabel")}
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-3xl">
            {organization.name}
          </h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">/{organization.slug}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatPill tone={organization.demo_mode ? "warning" : "success"}>
              {organization.demo_mode ? t("demoActive") : t("liveData")}
            </StatPill>
            <StatPill tone={organization.metaEnabled ? "success" : "neutral"}>
              {organization.metaEnabled ? t("metaEnabled") : t("metaDisabled")}
            </StatPill>
            <StatPill>
              {organization.leadCount} {t("leads")}
            </StatPill>
            <StatPill>
              {organization.userCount} {t("users")}
            </StatPill>
          </div>
        </div>
        <Button
          type="button"
          className="h-10 shrink-0"
          disabled={openingDashboard}
          onClick={() => {
            setOpeningDashboard(true)
            void openClientDashboard(slug, setActiveOrganization, router).finally(
              () => setOpeningDashboard(false)
            )
          }}
        >
          {openingDashboard ? t("openingDashboard") : t("openDashboard")}
        </Button>
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle>{t("overviewTitle")}</CardTitle>
          <CardDescription>{t("overviewDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            {t("statusLabel")}{" "}
            <strong>{organization.demo_mode ? t("demoActive") : t("liveData")}</strong>
          </p>
          <Button
            variant="outline"
            className="h-10"
            disabled={savingDemo}
            onClick={() => {
              void toggleDemoMode()
            }}
          >
            {savingDemo
              ? t("saving")
              : organization.demo_mode
                ? t("disableDemo")
                : t("enableDemo")}
          </Button>
        </CardContent>
      </Card>

      <AdminMetaConfigForm
        slug={slug}
        initialConfig={metaConfig}
        onSaved={() => {
          void load()
        }}
      />

      <AdminInviteUserForm
        organizationId={organization.id}
        onInvited={() => {
          void load()
        }}
      />

      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle>{t("usersTitle")}</CardTitle>
          <CardDescription>{t("usersDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noUsersYet")}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="rounded-[15px] bg-muted/70 px-3 py-2 text-sm"
                >
                  <p className="font-medium">
                    {user.email ?? user.full_name ?? user.id}
                  </p>
                  <p className="text-muted-foreground">{user.role}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
