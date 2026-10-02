"use client"

import { Suspense, useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"

import { AdminLeadSheetTemplateEditor } from "@/components/admin/lead-sheets/AdminLeadSheetTemplateEditor"
import { LeadSheetTemplateEditorSkeleton } from "@/components/admin/lead-sheets/LeadSheetsPanelSkeletons"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import type {
  BusinessCategory,
  ResolvedLeadSheetConfig,
  TemplateClientRef,
} from "@/lib/lead-sheet/types"

function LeadSheetTemplateEditPageInner() {
  const { t } = useLanguage()
  const params = useParams()
  const searchParams = useSearchParams()
  const id = String(params.id ?? "")
  const clientSlug = searchParams.get("client")
  const [config, setConfig] = useState<ResolvedLeadSheetConfig | null>(null)
  const [usageClients, setUsageClients] = useState<TemplateClientRef[]>([])
  const [categories, setCategories] = useState<BusinessCategory[]>([])

  useEffect(() => {
    if (!id) return
    void (async () => {
      const [tRes, cRes] = await Promise.all([
        fetch(`/api/admin/lead-sheet-templates/${id}`),
        fetch("/api/admin/business-categories"),
      ])
      const tpl = (await tRes.json()) as ResolvedLeadSheetConfig & {
        usage?: { clients: TemplateClientRef[] }
      }
      const cat = (await cRes.json()) as { categories: BusinessCategory[] }
      setUsageClients(tpl.usage?.clients ?? [])
      setConfig(tpl)
      setCategories(cat.categories ?? [])
    })()
  }, [id])

  if (!config) {
    return (
      <>
        <p className="sr-only">{t("leadSheetsLoading")}</p>
        <LeadSheetTemplateEditorSkeleton showClientBanner={Boolean(clientSlug)} />
      </>
    )
  }

  return (
    <AdminLeadSheetTemplateEditor
      templateId={id}
      initial={config}
      categories={categories}
      clientSlug={clientSlug}
      usageClients={usageClients}
    />
  )
}

export default function LeadSheetTemplateEditPage() {
  const { t } = useLanguage()
  return (
    <Suspense
      fallback={
        <>
          <p className="sr-only">{t("leadSheetsLoading")}</p>
          <LeadSheetTemplateEditorSkeleton />
        </>
      }
    >
      <LeadSheetTemplateEditPageInner />
    </Suspense>
  )
}
