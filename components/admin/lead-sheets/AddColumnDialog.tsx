"use client"

import { Loader2Icon } from "lucide-react"

import { ModalShell } from "@/components/admin/ModalShell"
import {
  NewColumnForm,
  useNewColumnForm,
  type NewColumnValues,
} from "@/components/admin/lead-sheets/NewColumnForm"
import { fieldTypeLabelKey } from "@/components/admin/lead-sheets/field-type-meta"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"

export type { NewColumnValues }

type Props = {
  afterLabel?: string
  title?: (typeLabel: string) => string
  submitLabel?: string
  sharedNote?: string | null
  onSubmit: (values: NewColumnValues) => Promise<string | null>
  onClose: () => void
}

/** Mount only while open so the draft resets on each open. */
export function AddColumnDialog({
  afterLabel,
  title,
  submitLabel,
  sharedNote,
  onSubmit,
  onClose,
}: Props) {
  const { t } = useLanguage()
  const form = useNewColumnForm()
  const typeLabel = t(fieldTypeLabelKey(form.fieldType))

  async function submit() {
    if (!form.canSubmit) return
    form.setSaving(true)
    form.setError(null)
    const message = await onSubmit(form.values())
    if (message) {
      form.setError(message)
      form.setSaving(false)
    }
  }

  return (
    <ModalShell
      title={
        title
          ? title(typeLabel.toLocaleLowerCase())
          : t("leadSheetsNewColumnTitle").replace("{type}", typeLabel.toLocaleLowerCase())
      }
      subtitle={
        afterLabel ? t("leadSheetsNewColumnAfter").replace("{name}", afterLabel) : undefined
      }
      onClose={onClose}
      dismissible={form.pristine}
      busy={form.saving}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={form.saving} onClick={onClose}>
            {t("leadSheetCancel")}
          </Button>
          <Button type="button" disabled={!form.canSubmit} onClick={() => void submit()}>
            {form.saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {submitLabel ?? t("leadSheetsAddColumn")}
          </Button>
        </>
      }
    >
      <NewColumnForm form={form} sharedNote={sharedNote} autoFocus onEnterSubmit={() => void submit()} />
    </ModalShell>
  )
}
