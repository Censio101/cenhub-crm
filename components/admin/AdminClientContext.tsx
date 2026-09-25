"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import type { MetaConfig } from "@/components/admin/AdminMetaConfigForm"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
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
  reload: (options?: { silent?: boolean }) => Promise<void>
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
  const { setActiveOrganization } = useActiveOrganization()
  const syncedSlugRef = useRef<string | null>(null)
  const [organization, setOrganization] = useState<AdminClientOrganization | null>(null)
  const [users, setUsers] = useState<ProfileRow[]>([])
  const [metaConfig, setMetaConfig] = useState<MetaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const response = await fetch(
        `/api/admin/organizations/${slug}/manage-bootstrap`,
        { cache: "no-store" }
      )

      if (!response.ok) throw new Error(t("clientNotFound"))

      const data = (await response.json()) as {
        organization: AdminClientOrganization
        users: ProfileRow[]
        metaConfig: MetaConfig | null
      }

      setOrganization(data.organization)
      setUsers(data.users ?? [])
      setMetaConfig(
        data.metaConfig
          ? {
              metaAdAccountId: data.metaConfig.metaAdAccountId ?? "",
              metaPageId: data.metaConfig.metaPageId ?? "",
              metaPixelId: data.metaConfig.metaPixelId ?? "",
              enabled: Boolean(data.metaConfig.enabled),
              metaSyncStatus: data.metaConfig.metaSyncStatus ?? "disabled",
              metaSyncError: data.metaConfig.metaSyncError ?? null,
              metaLastSyncedAt: data.metaConfig.metaLastSyncedAt ?? null,
            }
          : null
      )
    } catch (loadError) {
      setOrganization(null)
      setError(loadError instanceof Error ? loadError.message : t("errorLoadClient"))
    } finally {
      if (!options?.silent) {
        setLoading(false)
      }
    }
  }, [slug, t])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!organization) return
    if (syncedSlugRef.current === slug) return
    syncedSlugRef.current = slug
    void setActiveOrganization(slug)
  }, [organization, slug, setActiveOrganization])

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
