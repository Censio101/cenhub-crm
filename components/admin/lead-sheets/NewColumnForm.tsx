"use client"

import { useState } from "react"
import { InfoIcon } from "lucide-react"

import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import { FIELD_TYPE_ICONS, fieldTypeLabelKey } from "@/components/admin/lead-sheets/field-type-meta"
import { SelectOptionsInput } from "@/components/admin/lead-sheets/SelectOptionsInput"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { isValidFieldKey, suggestFieldKey } from "@/lib/lead-sheet/field-key"
import { CUSTOM_FIELD_TYPES, type CustomFieldType } from "@/lib/lead-sheet/types"
import { cn } from "cn"

export type NewColumnValues = {
  label: string
  fieldType: CustomFieldType
  fieldKey: string
  options?: string[]
}

export function useNewColumnForm() {
  const [fieldType, setFieldType] = useState<CustomFieldType>("text")
  const [label, setLabel] = useState("")
  const [customKey, setCustomKey] = useState<string | null>(null)
  const [options, setOptions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggestedKey = suggestFieldKey(label)
  const fieldKey = customKey ?? suggestedKey
  const keyValid = isValidFieldKey(fieldKey)
  const needsOptions = fieldType === "select"
  const optionsMissing = needsOptions && options.length === 0
  const showKeyError = !keyValid && (customKey !== null || label.trim().length > 0)
  const canSubmit = label.trim().length > 0 && keyValid && !optionsMissing && !saving
  const pristine = !label.trim() && customKey === null && options.length === 0

  function values(): NewColumnValues {
    return {
      label: label.trim(),
      fieldType,
      fieldKey,
      ...(needsOptions ? { options } : {}),
    }
  }

  return {
    fieldType,
    setFieldType,
    label,
    setLabel,
    customKey,
    setCustomKey,
    options,
    setOptions,
    saving,
    setSaving,
    error,
    setError,
    fieldKey,
    keyValid,
    showKeyError,
    needsOptions,
    optionsMissing,
    canSubmit,
    pristine,
    values,
  }
}

type FormProps = {
  form: ReturnType<typeof useNewColumnForm>
  sharedNote?: string | null
  autoFocus?: boolean
  fieldKeyId?: string
  onEnterSubmit?: () => void
}

export function NewColumnForm({
  form,
  sharedNote,
  autoFocus,
  fieldKeyId = "add-column-field-key",
  onEnterSubmit,
}: FormProps) {
  const { t } = useLanguage()
  const {
    fieldType,
    setFieldType,
    label,
    setLabel,
    customKey,
    setCustomKey,
    options,
    setOptions,
    saving,
    fieldKey,
    showKeyError,
    needsOptions,
    optionsMissing,
    error,
  } = form

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      onEnterSubmit?.()
    }
  }

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-1.5" disabled={saving}>
        <legend className="mb-1.5 text-sm font-medium">{t("leadSheetsColumnType")}</legend>
        <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CUSTOM_FIELD_TYPES.map((ft) => {
            const Icon = FIELD_TYPE_ICONS[ft]
            const selected = ft === fieldType
            return (
              <button
                key={ft}
                type="button"
                role="radio"
                aria-checked={selected}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  selected
                    ? "border-primary bg-primary/5 font-medium text-primary"
                    : "border-[#d3c3b2] bg-white hover:border-primary/45"
                )}
                onClick={() => setFieldType(ft)}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{t(fieldTypeLabelKey(ft))}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">{t("leadSheetsColumnName")}</span>
        <input
          className={adminFieldClass}
          value={label}
          autoFocus={autoFocus}
          maxLength={80}
          disabled={saving}
          placeholder={t("leadSheetsColumnNamePlaceholder")}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={onEnter}
        />
      </label>

      <div className="grid gap-1 text-sm">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={fieldKeyId} className="font-medium">
            {t("leadSheetsFieldKey")}
          </label>
          {customKey !== null ? (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={() => setCustomKey(null)}
            >
              {t("leadSheetsFieldKeyReset")}
            </button>
          ) : null}
        </div>
        <input
          id={fieldKeyId}
          className={cn(
            adminFieldClass,
            "h-10 font-mono text-sm",
            showKeyError && "border-red-400 focus:border-red-500"
          )}
          value={fieldKey}
          maxLength={48}
          disabled={saving}
          spellCheck={false}
          autoComplete="off"
          placeholder="budget"
          aria-invalid={showKeyError}
          onChange={(e) => setCustomKey(e.target.value.toLowerCase().replace(/[\s-]+/g, "_"))}
          onKeyDown={onEnter}
        />
        {showKeyError ? (
          <p className="text-xs text-red-700">{t("leadSheetsFieldKeyInvalid")}</p>
        ) : null}
      </div>

      {needsOptions ? (
        <div className="grid gap-1 text-sm">
          <span className="font-medium">{t("leadSheetsOptionsHeading")}</span>
          <SelectOptionsInput
            options={options}
            onChange={setOptions}
            disabled={saving}
            invalid={optionsMissing && label.trim().length > 0}
          />
        </div>
      ) : null}

      {fieldType === "image" ? (
        <div className="rounded-xl border border-dashed border-[#d3c3b2] bg-[#faf8f6] px-3 py-2.5 text-sm">
          <p className="text-muted-foreground">{t("leadSheetsImageColumnHint")}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("leadSheetsImageColumnExample")}{" "}
            <span className="font-medium text-primary underline underline-offset-2">
              {t("leadSheetImageLinkTextPlaceholder")}
            </span>
          </p>
        </div>
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
    </div>
  )
}
