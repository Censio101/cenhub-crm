"use client"

import { useState } from "react"
import { Loader2Icon } from "lucide-react"

import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import { mergeNames, NamesChipInput } from "@/components/admin/business-categories/NamesChipInput"
import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

/** Resolve with an error message to show inline, or `null` when done (parent closes the dialog). */
type SubmitResult = Promise<string | null>

function DialogFooter({
  saving,
  canSubmit,
  submitLabel,
  onClose,
  onSubmit,
}: {
  saving: boolean
  canSubmit: boolean
  submitLabel: string
  onClose: () => void
  onSubmit: () => void
}) {
  const { t } = useLanguage()
  return (
    <>
      <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
        {t("leadSheetCancel")}
      </Button>
      <Button type="button" disabled={!canSubmit || saving} onClick={onSubmit}>
        {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </>
  )
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
      role="alert"
    >
      {message}
    </p>
  )
}

/** Mount only while open so the draft resets each time. */
export function AddCategoryDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (name: string, subcategories: string[]) => SubmitResult
  onClose: () => void
}) {
  const { t } = useLanguage()
  const [name, setName] = useState("")
  const [subs, setSubs] = useState<string[]>([])
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = name.trim().length > 0

  async function submit() {
    if (!canSubmit || saving) return
    setSaving(true)
    setError(null)
    const message = await onSubmit(name.trim(), mergeNames(subs, draft))
    if (message) {
      setError(message)
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title={t("businessCategoriesAddCategoryTitle")}
      onClose={onClose}
      dismissible={!name.trim() && subs.length === 0 && !draft.trim()}
      busy={saving}
      footer={
        <DialogFooter
          saving={saving}
          canSubmit={canSubmit}
          submitLabel={t("businessCategoriesCreate")}
          onClose={onClose}
          onSubmit={() => void submit()}
        />
      }
    >
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">{t("businessCategoriesCategoryNameLabel")}</span>
        <input
          autoFocus
          className={cn(adminFieldClass, "h-10")}
          value={name}
          disabled={saving}
          placeholder={t("businessCategoriesNamePlaceholder")}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void submit()
            }
          }}
        />
      </label>

      <div className="grid gap-1.5 text-sm">
        <span className="font-medium">{t("businessCategoriesSubsOptionalLabel")}</span>
        <NamesChipInput
          names={subs}
          onChange={setSubs}
          draft={draft}
          onDraftChange={setDraft}
          disabled={saving}
        />
      </div>

      <ErrorLine message={error} />
    </ModalShell>
  )
}

export function AddSubcategoriesDialog({
  categoryLabel,
  initialNames,
  onSubmit,
  onClose,
}: {
  categoryLabel: string
  initialNames?: string[]
  onSubmit: (names: string[]) => SubmitResult
  onClose: () => void
}) {
  const { t } = useLanguage()
  const [names, setNames] = useState<string[]>(initialNames ?? [])
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const all = mergeNames(names, draft)
  const canSubmit = all.length > 0

  async function submit() {
    if (!canSubmit || saving) return
    setSaving(true)
    setError(null)
    const message = await onSubmit(all)
    if (message) {
      setError(message)
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title={t("businessCategoriesAddSubsTitle")}
      subtitle={t("businessCategoriesAddSubsSubtitle").replace("{category}", categoryLabel)}
      size="sm"
      onClose={onClose}
      dismissible={names.length === 0 && !draft.trim()}
      busy={saving}
      footer={
        <DialogFooter
          saving={saving}
          canSubmit={canSubmit}
          submitLabel={
            all.length > 1
              ? t("businessCategoriesAddCount").replace("{count}", String(all.length))
              : t("businessCategoriesAddAction")
          }
          onClose={onClose}
          onSubmit={() => void submit()}
        />
      }
    >
      <NamesChipInput
        names={names}
        onChange={setNames}
        draft={draft}
        onDraftChange={setDraft}
        disabled={saving}
        autoFocus
      />
      <ErrorLine message={error} />
    </ModalShell>
  )
}

export function RenameDialog({
  title,
  initialValue,
  onSubmit,
  onClose,
}: {
  title: string
  initialValue: string
  onSubmit: (name: string) => SubmitResult
  onClose: () => void
}) {
  const { t } = useLanguage()
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = value.trim()
  const canSubmit = trimmed.length > 0 && trimmed !== initialValue.trim()

  async function submit() {
    if (!canSubmit || saving) return
    setSaving(true)
    setError(null)
    const message = await onSubmit(trimmed)
    if (message) {
      setError(message)
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title={title}
      size="sm"
      onClose={onClose}
      dismissible={trimmed === initialValue.trim()}
      busy={saving}
      footer={
        <DialogFooter
          saving={saving}
          canSubmit={canSubmit}
          submitLabel={t("businessCategoriesSave")}
          onClose={onClose}
          onSubmit={() => void submit()}
        />
      }
    >
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">{t("businessCategoriesName")}</span>
        <input
          autoFocus
          className={cn(adminFieldClass, "h-10")}
          value={value}
          disabled={saving}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void submit()
            }
          }}
        />
      </label>
      <ErrorLine message={error} />
    </ModalShell>
  )
}
