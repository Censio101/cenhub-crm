"use client"

import { useMemo, useState } from "react"
import { AlertTriangleIcon, InfoIcon, Loader2Icon } from "lucide-react"

import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import { ModalShell } from "@/components/admin/ModalShell"
import { FIELD_TYPE_ICONS, fieldTypeLabelKey } from "@/components/admin/lead-sheets/field-type-meta"
import { SelectOptionsInput } from "@/components/admin/lead-sheets/SelectOptionsInput"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import type { LeadSheetCustomFieldDef } from "@/lib/lead-sheet/types"
import { cn } from "cn"

export type ColumnSettingsValues = {
  label: string
  options?: string[]
}

type Props = {
  field: LeadSheetCustomFieldDef
  /** Overrides the default dialog title. */
  title?: string
  /** Shown when the template is shared with other clients. */
  sharedNote?: string | null
  /** Resolve with an error message to show inline, or `null` when saved. */
  onSubmit: (values: ColumnSettingsValues) => Promise<string | null>
  onClose: () => void
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((value) => b.includes(value))
}

/** Settings for a custom field: its name and, for select fields, the options. */
export function EditColumnDialog({ field, title, sharedNote, onSubmit, onClose }: Props) {
  const { t } = useLanguage()
  const isSelect = field.fieldType === "select"
  const initialOptions = useMemo(() => field.config.options ?? [], [field.config.options])
  const [label, setLabel] = useState(field.label)
  const [options, setOptions] = useState<string[]>(initialOptions)
  const [confirmRemoval, setConfirmRemoval] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const removedOptions = initialOptions.filter((o) => !options.includes(o))
  const optionsMissing = isSelect && options.length === 0
  const labelMissing = label.trim().length === 0
  const dirty = label.trim() !== field.label || (isSelect && !sameSet(options, initialOptions))
  const canSubmit = dirty && !optionsMissing && !labelMissing && !saving
  const needsRemovalConfirm = removedOptions.length > 0 && !confirmRemoval

  const Icon = FIELD_TYPE_ICONS[field.fieldType]

  async function submit() {
    if (!canSubmit) return
    if (needsRemovalConfirm) {
      // First click on a destructive change only asks for confirmation.
      setConfirmRemoval(true)
      return
    }
    setSaving(true)
    setError(null)
    const message = await onSubmit({
      label: label.trim(),
      ...(isSelect ? { options } : {}),
    })
    // On success the parent unmounts this dialog.
    if (message) {
      setError(message)
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title={title ?? t("leadSheetsEditColumnTitle")}
      subtitle={field.fieldKey}
      onClose={onClose}
      dismissible={!dirty}
      busy={saving}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
            {t("leadSheetCancel")}
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            className={cn(confirmRemoval && "bg-red-600 text-white hover:bg-red-700")}
            onClick={() => void submit()}
          >
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {confirmRemoval ? t("leadSheetsOptionsConfirmRemoval") : t("leadSheetSaveAssignment")}
          </Button>
        </>
      }
    >
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0" aria-hidden />
        {t(fieldTypeLabelKey(field.fieldType))}
      </p>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">{t("leadFieldsName")}</span>
        <input
          className={adminFieldClass}
          value={label}
          maxLength={80}
          disabled={saving}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void submit()
            }
          }}
        />
      </label>

      {isSelect ? (
        <div className="grid gap-1 text-sm">
          <span className="font-medium">{t("leadSheetsOptionsHeading")}</span>
          <SelectOptionsInput
            options={options}
            onChange={(next) => {
              setOptions(next)
              setConfirmRemoval(false)
            }}
            disabled={saving}
            invalid={optionsMissing}
          />
        </div>
      ) : null}

      {removedOptions.length > 0 ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950"
        >
          <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0 text-amber-700" aria-hidden />
          <span>
            {t("leadSheetsOptionsRemovedWarning").replace("{options}", removedOptions.join(", "))}
          </span>
        </p>
      ) : null}

      {sharedNote ? (
        <p className="flex items-start gap-2 rounded-lg border border-[#d3c3b2] bg-[#faf8f6] px-3 py-2 text-xs text-muted-foreground">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {sharedNote}
        </p>
      ) : null}

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
