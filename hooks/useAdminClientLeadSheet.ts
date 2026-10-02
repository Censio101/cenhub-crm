"use client"

import { useCallback, useMemo, useState } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { FieldTypeConflict } from "@/lib/lead-sheet/sheet-diff"
import type { LeadSheetTemplateSummary, ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import { useAsyncEffect } from "@/lib/react/use-async-effect"

type AssignResponse = {
  webhookReviewNeeded?: boolean
  metaFormsNeedingRemap?: number
  typeConflicts?: FieldTypeConflict[]
}

export function useAdminClientLeadSheet(slug: string, clientName: string) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState("")
  const [templates, setTemplates] = useState<LeadSheetTemplateSummary[]>([])
  const [resolved, setResolved] = useState<ResolvedLeadSheetConfig | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  /** Set after assigning a sheet to a client that already has webhooks. */
  const [webhookReviewNeeded, setWebhookReviewNeeded] = useState(false)
  const [typeConflicts, setTypeConflicts] = useState<FieldTypeConflict[]>([])
  /** Facebook forms whose mapping should be checked against the new sheet. */
  const [metaFormsNeedingRemap, setMetaFormsNeedingRemap] = useState(0)

  const applyAssignResponse = useCallback(async (res: Response) => {
    const data = (await res.json().catch(() => ({}))) as AssignResponse
    setWebhookReviewNeeded(Boolean(data.webhookReviewNeeded))
    setMetaFormsNeedingRemap(data.metaFormsNeedingRemap ?? 0)
    setTypeConflicts(data.typeConflicts ?? [])
  }, [])

  /** `silent` refreshes in place (after a save) instead of swapping the page for a skeleton. */
  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!slug) return
      if (!options?.silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const assignRes = await fetch(`/api/admin/organizations/${slug}/lead-sheet`)
        if (!assignRes.ok) throw new Error("load")
        const assign = (await assignRes.json()) as {
          organizationId: string
          templateId: string | null
          resolved: ResolvedLeadSheetConfig | null
          templates: LeadSheetTemplateSummary[]
        }
        setOrganizationId(assign.organizationId ?? null)
        setTemplateId(assign.templateId ?? assign.resolved?.template.id ?? "")
        setResolved(assign.resolved)
        setTemplates(assign.templates ?? [])
      } catch {
        setError(t("leadSheetsLoadError"))
      } finally {
        setLoading(false)
      }
    },
    [slug, t]
  )

  useAsyncEffect(() => {
    void load()
  }, [load])

  const sharedTemplates = useMemo(() => templates.filter((tpl) => !tpl.organizationId), [templates])

  const clientTemplates = useMemo(
    () => templates.filter((tpl) => tpl.organizationId === organizationId),
    [templates, organizationId]
  )

  const savedTemplate = useMemo(
    () => [...sharedTemplates, ...clientTemplates].find((x) => x.id === templateId),
    [sharedTemplates, clientTemplates, templateId]
  )

  const savedIsClientOwned = Boolean(
    savedTemplate?.organizationId && savedTemplate.organizationId === organizationId
  )

  async function patchTemplateId(newId: string) {
    if (!slug) return false
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/organizations/${slug}/lead-sheet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: newId }),
      })
      if (!res.ok) throw new Error("save")
      await applyAssignResponse(res)
      setTemplateId(newId)
      setNotice(t("leadSheetAssignmentSaved"))
      await load({ silent: true })
      return true
    } catch {
      setError(t("leadSheetsLoadError"))
      return false
    } finally {
      setBusy(false)
    }
  }

  /**
   * Creates a client-owned template and immediately assigns it. In the new
   * flow, creating a unique sheet always means "I want to use this now" —
   * the org's assignment switches to the new sheet right away so the
   * embedded editor appears without any extra step.
   */
  async function createClientTemplate(options: { sourceId?: string; blank?: boolean }) {
    if (!slug || !organizationId) return null
    setBusy(true)
    setError(null)
    try {
      let newId: string
      const baseName = clientName
      if (options.blank) {
        const res = await fetch("/api/admin/lead-sheet-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: t("leadSheetClientTemplateName").replace("{client}", baseName),
            organizationId,
            isShared: false,
          }),
        })
        if (!res.ok) throw new Error("create")
        const data = (await res.json()) as ResolvedLeadSheetConfig
        newId = data.template.id
      } else {
        const sourceId = options.sourceId ?? sharedTemplates[0]?.id
        if (!sourceId) throw new Error("no source")
        const res = await fetch(`/api/admin/lead-sheet-templates/${sourceId}/duplicate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: t("leadSheetClientTemplateName").replace("{client}", baseName),
            organizationId,
            isShared: false,
          }),
        })
        if (!res.ok) throw new Error("dup")
        const data = (await res.json()) as ResolvedLeadSheetConfig
        newId = data.template.id
      }

      const assignRes = await fetch(`/api/admin/organizations/${slug}/lead-sheet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: newId }),
      })
      if (!assignRes.ok) throw new Error("assign")
      await applyAssignResponse(assignRes)
      setNotice(t("clientLeadSheetCustomCreatedNotice").replace("{client}", baseName))

      await load({ silent: true })
      return newId
    } catch {
      setError(t("leadSheetsLoadError"))
      return null
    } finally {
      setBusy(false)
    }
  }

  return {
    loading,
    busy,
    error,
    notice,
    setError,
    setNotice,
    templateId,
    resolved,
    organizationId,
    sharedTemplates,
    clientTemplates,
    savedTemplate,
    savedIsClientOwned,
    webhookReviewNeeded,
    metaFormsNeedingRemap,
    typeConflicts,
    dismissWebhookReview: () => {
      setWebhookReviewNeeded(false)
      setMetaFormsNeedingRemap(0)
      setTypeConflicts([])
    },
    patchTemplateId,
    createClientTemplate,
    reload: load,
  }
}
