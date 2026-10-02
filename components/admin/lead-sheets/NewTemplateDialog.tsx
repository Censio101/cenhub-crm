"use client"

import { FormEvent, useMemo, useState } from "react"
import { Loader2Icon } from "lucide-react"

import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { LeadSheetTemplateSummary } from "@/lib/lead-sheet/types"
import { cn } from "cn"

type Props = {
  templates: LeadSheetTemplateSummary[]
  /** Resolves with an error message to show inline, or `null` when created (the page then leaves). */
  onCreate: (input: { name: string; sourceId: string | null }) => Promise<string | null>
  onClose: () => void
}

/** Name plus what to start from: the Standard fields (default) or a copy of another template. */
export function NewTemplateDialog({ templates, onCreate, onClose }: Props) {
  const { t } = useLanguage()
  const sorted = useMemo(
    () =>
      [...templates].sort((a, b) => {
        if (a.isSystemDefault !== b.isSystemDefault) return a.isSystemDefault ? -1 : 1
        return a.name.localeCompare(b.name)
      }),
    [templates]
  )
  const [name, setName] = useState("")
  const [chosenSource, setSource] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Nothing chosen yet means the Standard template.
  const sourceId = chosenSource || sorted[0]?.id || ""
  const source = sorted.find((tpl) => tpl.id === sourceId)
  const sourceLabel = source
    ? source.isSystemDefault
      ? `${source.name} (${t("leadSheetsBadgeDefault")})`
      : source.name
    : null

  const canSubmit = name.trim().length > 0 && !saving

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    const message = await onCreate({ name: name.trim(), sourceId: sourceId || null })
    // On success the page navigates to the new template.
    if (message) {
      setError(message)
      setSaving(false)
    }
  }

  return (
    <ModalShell
      size="sm"
      title={t("leadSheetsNewTemplate")}
      busy={saving}
      dismissible={!saving}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
            {t("leadSheetCancel")}
          </Button>
          <Button type="submit" form="new-template-form" disabled={!canSubmit}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {t("leadSheetsCreateTemplate")}
          </Button>
        </>
      }
    >
      <form id="new-template-form" className="grid gap-4" onSubmit={(e) => void submit(e)}>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">{t("leadSheetsNewTemplateName")}</span>
          <input
            className={adminFieldClass}
            value={name}
            autoFocus
            maxLength={80}
            disabled={saving}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        {sorted.length > 1 ? (
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("leadSheetsStartFrom")}</span>
            <Select
              value={sourceId || null}
              onValueChange={(v) => typeof v === "string" && setSource(v)}
              disabled={saving}
            >
              <SelectTrigger className={cn(adminFieldClass, "w-full min-w-0")}>
                <SelectValue placeholder={t("leadSheetSelectPlaceholder")}>
                  {sourceLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger className="min-w-[var(--anchor-width)]">
                {sorted.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.isSystemDefault
                      ? `${tpl.name} (${t("leadSheetsBadgeDefault")})`
                      : tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {error}
          </p>
        ) : null}
      </form>
    </ModalShell>
  )
}
