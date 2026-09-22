"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import { AdminInviteUserForm } from "@/components/admin/AdminInviteUserForm"
import { AdminMetaConfigForm } from "@/components/admin/AdminMetaConfigForm"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ProfileRow } from "@/lib/db/types"

type OrganizationSummary = {
  id: string
  slug: string
  name: string
  demo_mode: boolean
  leadCount: number
  userCount: number
  metaEnabled: boolean
}

export function AdminClientDetail({ slug }: { slug: string }) {
  const { t } = useLanguage()
  const [organization, setOrganization] = useState<OrganizationSummary | null>(null)
  const [users, setUsers] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingDemo, setSavingDemo] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [orgResponse, usersResponse] = await Promise.all([
        fetch(`/api/admin/organizations/${slug}`, { cache: "no-store" }),
        fetch(`/api/admin/organizations/${slug}/users`, { cache: "no-store" }),
      ])

      if (!orgResponse.ok) throw new Error(t("clientNotFound"))
      const orgData = (await orgResponse.json()) as { organization: OrganizationSummary }
      setOrganization(orgData.organization)

      if (usersResponse.ok) {
        const usersData = (await usersResponse.json()) as { users: ProfileRow[] }
        setUsers(usersData.users)
      }
    } catch (loadError) {
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

  if (!loading && !organization) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-destructive">{error ?? t("clientNotFound")}</p>
        <Button render={<Link href="/admin" />} className="mt-4 h-10">
          {t("backToClients")}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            ← {t("allClients")}
          </Link>
          <h1 className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">
            {organization?.name ?? slug}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {organization?.slug ?? slug}
          </p>
        </div>
        {organization ? (
          <dl className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <div>
              {organization.leadCount} {t("leads")}
            </div>
            <div>
              {organization.userCount} {t("users")}
            </div>
            <div>
              {organization.metaEnabled ? t("metaEnabled") : t("metaDisabled")}
            </div>
          </dl>
        ) : null}
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {organization ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("overviewTitle")}</CardTitle>
              <CardDescription>{t("overviewDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                {t("statusLabel")}{" "}
                <strong>
                  {organization.demo_mode ? t("demoActive") : t("liveData")}
                </strong>
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

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminInviteUserForm
              organizationId={organization.id}
              onInvited={() => {
                void load()
              }}
            />
            <Card>
              <CardHeader>
                <CardTitle>{t("usersTitle")}</CardTitle>
                <CardDescription>{t("usersDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noUsersYet")}</p>
                ) : (
                  <ul className="grid gap-2">
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

          <AdminMetaConfigForm slug={slug} />

          <Card>
            <CardHeader>
              <CardTitle>{t("censioAdminsTitle")}</CardTitle>
              <CardDescription>{t("censioAdminsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminInviteUserForm onInvited={() => undefined} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
