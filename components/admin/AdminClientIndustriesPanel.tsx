"use client"

import Link from "next/link"
import { useCallback, useState } from "react"
import { ArrowRightIcon, CheckCircle2Icon, PlusIcon } from "lucide-react"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useAdminClient } from "@/components/admin/AdminClientContext"
import {
  ClientIndustriesEditor,
  type ClientIndustriesState,
} from "@/components/admin/client-industries/ClientIndustriesEditor"
import { ClientServicesSummary } from "@/components/admin/client-industries/ClientServicesSummary"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { FormNoticeStack } from "@/components/ui/form-notice"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import { businessCategoryLabel } from "@/lib/lead-sheet/business-category-label"
import type { BusinessCategory } from "@/lib/lead-sheet/types"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { cn } from "cn"

function PanelSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className={cn(adminSectionCardClass, "space-y-3 p-4")}>
          <div className="skeleton-shimmer h-5 w-40 rounded-md" />
          <div className="flex flex-wrap gap-2">
            <div className="skeleton-shimmer h-7 w-24 rounded-full" />
            <div className="skeleton-shimmer h-7 w-32 rounded-full" />
            <div className="skeleton-shimmer h-7 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function AdminClientIndustriesPanel() {
  const { slug } = useAdminClient()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<BusinessCategory | null>(null)
  const [categories, setCategories] = useState<BusinessCategory[]>([])
  const [industries, setIndustries] = useState<ClientIndustriesState>({
    categoryIds: [],
    subcategoryIds: [],
  })

  const load = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      const [indRes, catRes] = await Promise.all([
        fetch(`/api/admin/organizations/${slug}/industries`),
        fetch("/api/admin/business-categories"),
      ])
      if (!indRes.ok) throw new Error("load")
      const ind = (await indRes.json()) as {
        categoryIds: string[]
        subcategoryIds: string[]
      }
      const catData = (await catRes.json()) as {
        categories: BusinessCategory[]
      }
      setIndustries({
        categoryIds: ind.categoryIds ?? [],
        subcategoryIds: ind.subcategoryIds ?? [],
      })
      setCategories(catData.categories ?? [])
    } catch {
      setError(t("leadSheetsLoadError"))
    } finally {
      setLoading(false)
    }
  }, [slug, t])

  useAsyncEffect(() => {
    void load()
  }, [load])

  /**
   * Saves right away. Popups wait for the result (and show their own error); quick removals
   * update the screen first and roll back with a page error if the save fails.
   */
  async function persist(
    next: ClientIndustriesState,
    options?: { optimistic?: boolean }
  ): Promise<boolean> {
    if (!slug) return false
    const optimistic = options?.optimistic === true
    const previous = industries
    if (optimistic) setIndustries(next)
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/organizations/${slug}/industries`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error("save")
      if (!optimistic) setIndustries(next)
      const addedId = next.categoryIds.find((id) => !previous.categoryIds.includes(id))
      const removedJustAdded = justAdded && !next.categoryIds.includes(justAdded.id)
      if (addedId) setJustAdded(categories.find((category) => category.id === addedId) ?? null)
      else if (removedJustAdded) setJustAdded(null)
      return true
    } catch {
      if (optimistic) {
        setIndustries(previous)
        setError(t("leadSheetsLoadError"))
      }
      return false
    } finally {
      setBusy(false)
    }
  }

  const hasAvailable = categories.some((category) => !industries.categoryIds.includes(category.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{t("clientIndustriesTitle")}</h2>
        <Button
          type="button"
          className="h-10 gap-1.5 px-4"
          disabled={loading || !hasAvailable}
          onClick={() => setAdding(true)}
        >
          <PlusIcon className="size-4" />
          {t("clientIndustriesAddCategory")}
        </Button>
      </div>

      <FormNoticeStack
        error={error}
        success={null}
        onDismissError={() => setError(null)}
        onDismissSuccess={() => {}}
        dismissLabel={t("noticeDismiss")}
        size={adminFormNoticeDefaults.size}
        successAutoDismissMs={adminFormNoticeDefaults.quickSuccessAutoDismissMs}
        errorAutoDismissMs={adminFormNoticeDefaults.errorAutoDismissMs}
      />

      {loading ? (
        <PanelSkeleton />
      ) : (
        <ClientIndustriesEditor
          categories={categories}
          value={industries}
          busy={busy}
          adding={adding}
          onOpenAdding={() => setAdding(true)}
          onCloseAdding={() => setAdding(false)}
          onChange={persist}
        />
      )}

      {!loading && justAdded ? (
        <Link
          href={adminClientSettingsSectionPath(slug, "services")}
          className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 transition-colors hover:bg-emerald-100"
        >
          <CheckCircle2Icon className="size-5 shrink-0 text-emerald-600" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">
              {t("clientIndustriesAssigned").replace(
                "{category}",
                businessCategoryLabel(justAdded)
              )}
            </span>
            <span className="block text-emerald-800/80">
              {t("clientIndustriesChooseServices").replace(
                "{category}",
                businessCategoryLabel(justAdded)
              )}
            </span>
          </span>
          <ArrowRightIcon className="size-4 shrink-0" aria-hidden />
        </Link>
      ) : null}

      {!loading ? (
        <ClientServicesSummary
          slug={slug}
          refreshKey={busy ? "saving" : industries.categoryIds.join(",")}
        />
      ) : null}
    </div>
  )
}
