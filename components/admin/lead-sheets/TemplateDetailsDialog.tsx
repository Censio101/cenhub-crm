"use client"

import { useMemo, useState } from "react"
import { Loader2Icon } from "lucide-react"

import { ModalShell } from "@/components/admin/ModalShell"
import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import { TemplateCategoryTagsSection } from "@/components/admin/lead-sheets/TemplateCategoryTagsSection"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import type { BusinessCategory } from "@/lib/lead-sheet/types"

export type TemplateDetailsValues = {
  name: string
  categoryIds: string[]
}

type Props = {
  initial: TemplateDetailsValues
  categories: BusinessCategory[]
  /** System default keeps its name; only tags are editable. */
  isSystemDefault: boolean
  /** Resolve with an error message to show inline, or `null` when saved. */
  onSave: (values: TemplateDetailsValues) => Promise<string | null>
  onClose: () => void
}

function sameIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

/** Mount only while open — draft state initialises from `initial` on each open. */
export function TemplateDetailsDialog({
  initial,
  categories,
  isSystemDefault,
  onSave,
  onClose,
}: Props) {
  const { t } = useLanguage()
  const [name, setName] = useState(initial.name)
  const [categoryIds, setCategoryIds] = useState(initial.categoryIds)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = useMemo(
    () => name.trim() !== initial.name.trim() || !sameIds(categoryIds, initial.categoryIds),
    [name, categoryIds, initial]
  )
  const nameValid = isSystemDefault || name.trim().length > 0
  const canSave = dirty && nameValid && !saving

  async function submit() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    const message = await onSave({ name: name.trim(), categoryIds })
    // On success the parent unmounts this dialog.
    if (message) {
      setError(message)
      setSaving(false)
    }
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <ModalShell
      title={t("leadSheetsEditorDetailsHeading")}
      onClose={onClose}
      dismissible={!dirty}
      busy={saving}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
            {t("leadSheetCancel")}
          </Button>
          <Button type="button" disabled={!canSave} onClick={() => void submit()}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {t("leadSheetSaveAssignment")}
          </Button>
        </>
      }
    >
      <label className="grid gap-1 text-sm">
        <span className="font-medium">{t("leadSheetsNewTemplateName")}</span>
        <input
          className={adminFieldClass}
          value={name}
          readOnly={isSystemDefault}
          disabled={isSystemDefault || saving}
          autoFocus={!isSystemDefault}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void submit()
            }
          }}
        />
      </label>

      <TemplateCategoryTagsSection
        variant="plain"
        categories={categories}
        categoryIds={categoryIds}
        onToggle={toggleCategory}
        disabled={saving}
      />

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
    </ModalShell>
  )
}
