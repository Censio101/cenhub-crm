"use client"

import { FormEvent, useEffect, useState } from "react"
import { Loader2Icon } from "lucide-react"

import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import { ModalShell } from "@/components/admin/ModalShell"
import type { FunnelDto } from "@/components/admin/funnels/types"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"

type Props = {
  funnel: FunnelDto
  onSave: (patch: { sheetSourceLabel: string | null }) => Promise<string | null>
  onClose: () => void
}

export function FunnelSheetFilterDialog({ funnel, onSave, onClose }: Props) {
  const { t } = useLanguage()
  const [labelDraft, setLabelDraft] = useState(funnel.sheetSourceLabel ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLabelDraft(funnel.sheetSourceLabel ?? "")
  }, [funnel.id, funnel.sheetSourceLabel])

  const normalizedLabel = labelDraft.trim() || null
  const unchanged = normalizedLabel === (funnel.sheetSourceLabel?.trim() || null)

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (saving || unchanged) {
      if (unchanged) onClose()
      return
    }
    setSaving(true)
    setError(null)
    const message = await onSave({ sheetSourceLabel: normalizedLabel })
    if (message) {
      setError(message)
      setSaving(false)
      return
    }
    onClose()
  }

  return (
    <ModalShell
      size="md"
      title={t("funnelSheetFilterDialogTitle")}
      busy={saving}
      dismissible={!saving}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
            {t("leadSheetCancel")}
          </Button>
          <Button type="submit" form="funnel-sheet-filter-form" disabled={saving || unchanged}>
            {saving ? <Loader2Icon className="size-4 animate-spin" aria-hidden /> : null}
            {t("funnelSave")}
          </Button>
        </>
      }
    >
      <form id="funnel-sheet-filter-form" className="grid gap-4" onSubmit={(e) => void submit(e)}>
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-foreground">{t("funnelSheetSourceLabel")}</span>
          <p className="text-sm text-muted-foreground">{t("funnelSheetSourceLabelHint")}</p>
          <input
            className={adminFieldClass}
            value={labelDraft}
            autoFocus
            maxLength={120}
            placeholder={funnel.name}
            disabled={saving}
            onChange={(e) => setLabelDraft(e.target.value)}
          />
        </label>
        <p className="rounded-lg border border-[#efe7de] bg-[#faf8f5] px-3 py-2.5 text-sm text-muted-foreground">
          {t("funnelSheetFilterColumnsHint")}
        </p>
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </ModalShell>
  )
}
