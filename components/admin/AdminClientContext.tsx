"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import type { MetaConfig } from "@/components/admin/AdminMetaConfigForm"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { ProfileRow } from "@/lib/db/types"

export type AdminClientOrganization = {
  id: string
  slug: string
  name: string
  demo_mode: boolean
  leadCount: number
  userCount: number
  metaEnabled: boolean
}

type AdminClientContextValue = {
  slug: string
  organization: AdminClientOrganization | null
  users: ProfileRow[]
  metaConfig: MetaConfig | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const AdminClientContext = createContext<AdminClientContextValue | null>(null)

export function AdminClientProvider({
  slug,
  children,
}: {
  slug: string
  children: ReactNode
}) {
  const { t } = useLanguage()
  const [organization, setOrganization] = useState<AdminClientOrganization | null>(null)
  const [users, setUsers] = useState<ProfileRow[]>([])
  const [metaConfig, setMetaConfig] = useState<MetaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [orgResponse, usersResponse, metaResponse] = await Promise.all([
        fetch(`/api/admin/organizations/${slug}`, { cache: "no-store" }),
        fetch(`/api/admin/organizations/${slug}/users`, { cache: "no-store" }),
        fetch(`/api/admin/organizations/${slug}/meta`, { cache: "no-store" }),
      ])

      if (!orgResponse.ok) throw new Error(t("clientNotFound"))

      const orgData = (await orgResponse.json()) as { organization: AdminClientOrganization }
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
    void reload()
  }, [reload])

  const value = useMemo(
    () => ({
      slug,
      organization,
      users,
      metaConfig,
      loading,
      error,
      reload,
    }),
    [slug, organization, users, metaConfig, loading, error, reload]
  )

  return (
    <AdminClientContext.Provider value={value}>{children}</AdminClientContext.Provider>
  )
}

export function useOptionalAdminClient() {
  return useContext(AdminClientContext)
}

export function useAdminClient() {
  const context = useContext(AdminClientContext)
  if (!context) {
    throw new Error("useAdminClient must be used within AdminClientProvider")
  }
  return context
}
