"use client"

import { useState } from "react"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { AdminLeadSheetTemplateEditor } from "@/components/admin/lead-sheets/AdminLeadSheetTemplateEditor"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { useAdminClientLeadSheet } from "@/hooks/useAdminClientLeadSheet"
import type { BusinessCategory, ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { useKeyedState } from "@/lib/react/use-keyed-state"
import { cn } from "cn"

function ColumnRowSkeleton() {
  return (
    <div className={cn(adminSectionCardClass, "flex items-center gap-3 px-3 py-2.5")}>
      <div className="skeleton-shimmer size-4 shrink-0 rounded" />
      <div className="skeleton-shimmer size-4 shrink-0 rounded" />
      <div className="min-w-0 flex-1">
        <div className="skeleton-shimmer h-3.5 w-1/3 max-w-[12rem] rounded-md" />
      </div>
      <div className="skeleton-shimmer h-6 w-20 shrink-0 rounded-full" />
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className={cn(adminSectionCardClass, "space-y-3 p-4 sm:p-5")}>
        <div className="skeleton-shimmer h-11 w-full max-w-md rounded-xl" />
        <div className="skeleton-shimmer h-16 w-full rounded-xl" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, index) => (
          <ColumnRowSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}

type Props = {
  slug: string
  leadSheet: ReturnType<typeof useAdminClientLeadSheet>
}

/** The client's own sheet, editable in place. Rendered only while that sheet is the active one. */
export function ClientLeadSheetUniquePanel({ slug, leadSheet }: Props) {
  const { t } = useLanguage()
  const { clientTemplates, savedIsClientOwned, templateId, setError } = leadSheet

  const clientTemplate = clientTemplates[0] ?? null
  const isActive = Boolean(clientTemplate && savedIsClientOwned && clientTemplate.id === templateId)

  // The editor config belongs to the active sheet; it resets when that sheet changes.
  const activeTemplateId = clientTemplate && isActive ? clientTemplate.id : null
  const [config, setConfig] = useKeyedState<ResolvedLeadSheetConfig | null>(null, activeTemplateId)
  const [categories, setCategories] = useState<BusinessCategory[]>([])

  useAsyncEffect(
    async (signal) => {
      if (!activeTemplateId) return
      try {
        const [tRes, cRes] = await Promise.all([
          fetch(`/api/admin/lead-sheet-templates/${activeTemplateId}`),
          fetch("/api/admin/business-categories"),
        ])
        if (!tRes.ok) throw new Error("tpl")
        const tpl = (await tRes.json()) as ResolvedLeadSheetConfig
        const cat = (await cRes.json()) as { categories: BusinessCategory[] }
        if (signal.cancelled) return
        setConfig(tpl)
        setCategories(cat.categories ?? [])
      } catch {
        if (!signal.cancelled) setError(t("leadSheetsLoadError"))
      }
    },
    [activeTemplateId, t, setError]
  )

  if (!clientTemplate || !isActive) return null
  if (!config) return <PanelSkeleton />

  return (
    <AdminLeadSheetTemplateEditor
      templateId={clientTemplate.id}
      initial={config}
      categories={categories}
      clientSlug={slug}
      embeddedInClientSettings
    />
  )
}
