"use client"

import { useMemo, useState } from "react"
import { AlertTriangleIcon, ArrowRightIcon, CheckIcon, Loader2Icon, Trash2Icon } from "lucide-react"

import { META_CRM_FIELDS_ORDER, META_CRM_FIELD_I18N } from "@/lib/meta/instant-forms-crm-fields"
import {
  META_TARGET_PREFIX,
  findDanglingCustomTargets,
  findUnmappedColumns,
} from "@/lib/lead-sheet/mapping-review"
import type { WebhookCustomFieldSpec } from "@/lib/lead-sheet/webhook-spec"
import {
  metaCustomTarget,
  validateMetaFieldMappingForEnable,
  type MetaFieldMapping,
} from "@/lib/meta/meta-field-mapping"
import type { MetaInstantFormRow } from "@/components/admin/meta-instant-forms/types"
import { adminOutlineButtonClass } from "@/components/admin/admin-ui-styles"
import { cn } from "cn"
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
export type MappingDialogMode = "configure" | "enable"

type Props = {
  form: MetaInstantFormRow | null
  /** The client's custom lead sheet columns; answers can be mapped to them too. */
  customFields?: WebhookCustomFieldSpec[]
  /** The lead sheet this form's answers are saved into. */
  leadSheet?: {
    templateName: string
    isSystemDefault: boolean
    isClientOwned: boolean
  } | null
  mode: MappingDialogMode
  open: boolean
  busy: boolean
  /** Save error from the server, shown inside the popup. */
  error?: string | null
  onClose: () => void
  onSave: (mapping: MetaFieldMapping, enableAfter: boolean) => Promise<void>
  /** Marks the current mapping as still correct for the client's lead sheet. */
  onKeepAsIs: () => Promise<void>
}

/** Mounts the editor per form so its draft always starts from the saved mapping. */
export function MetaFormMappingDialog({ open, form, ...rest }: Props) {
  if (!open || !form) return null
  return <MappingEditor key={form.meta_form_id} form={form} {...rest} />
}

type EditorProps = Omit<Props, "open" | "form"> & { form: MetaInstantFormRow }

function MappingEditor({
  form,
  customFields = [],
  leadSheet,
  mode,
  busy,
  error = null,
  onClose,
  onSave,
  onKeepAsIs,
}: EditorProps) {
  const { t } = useLanguage()
  const [mapping, setMapping] = useState<MetaFieldMapping>(() => ({
    ...(form.field_mapping ?? {}),
  }))
  const [validationError, setValidationError] = useState<string | null>(null)

  const questions = useMemo(
    () => (form.questions_snapshot ?? []).filter((q) => String(q.key || "").trim()),
    [form]
  )

  const customKeys = useMemo(() => customFields.map((f) => f.key), [customFields])
  // Live, so the lists update as the admin removes or fills mappings.
  const danglingKeys = useMemo(
    () => findDanglingCustomTargets(mapping, META_TARGET_PREFIX, customKeys),
    [mapping, customKeys]
  )
  const unmappedColumns = useMemo(
    () => findUnmappedColumns(mapping, META_TARGET_PREFIX, customFields),
    [mapping, customFields]
  )
  const needsRemap = Boolean(form.mappingStatus?.needsRemap)

  const mappedMetaKeys = useMemo(
    () =>
      new Set(
        Object.values(mapping)
          .map((k) => String(k || "").trim())
          .filter(Boolean)
      ),
    [mapping]
  )

  const unmappedQuestions = questions.filter((q) => !mappedMetaKeys.has(String(q.key || "").trim()))

  function setCrmField(crmField: string, metaKey: string) {
    setMapping((current) => {
      const next = { ...current }
      for (const [canonical, key] of Object.entries(next)) {
        if (key === metaKey && canonical !== crmField) delete next[canonical]
      }
      if (metaKey) next[crmField] = metaKey
      else delete next[crmField]
      return next
    })
    setValidationError(null)
  }

  function validateForEnable(): boolean {
    const result = validateMetaFieldMappingForEnable(mapping)
    if (result.ok) return true
    if (result.code === "mapping_name_required") {
      setValidationError(t("metaInstantFormsMappingValidationName"))
    } else {
      setValidationError(t("metaInstantFormsMappingValidationContact"))
    }
    return false
  }

  async function handleSave(enableAfter: boolean) {
    if (enableAfter && !validateForEnable()) return
    await onSave(mapping, enableAfter)
  }

  function renderMappingRow(target: string, title: string, tone: "core" | "custom") {
    const selected = mapping[target] ?? ""
    return (
      <div key={target} className="flex items-center gap-3 px-3 py-2.5">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            tone === "custom" ? "bg-violet-500" : "bg-primary"
          )}
          aria-hidden
        />
        <p className="flex w-28 shrink-0 items-center gap-1.5 text-sm font-medium sm:w-40">
          <span className="truncate">{title}</span>
          {selected ? <CheckIcon className="size-4 shrink-0 text-emerald-600" aria-hidden /> : null}
        </p>
        <Select
          value={selected || "__none__"}
          onValueChange={(v) => setCrmField(target, !v || v === "__none__" ? "" : v)}
        >
          <SelectTrigger className="h-9 min-w-0 flex-1 border-[#e8e0d8] bg-[#faf8f6]">
            <SelectValue placeholder={t("metaInstantFormsMappingNone")}>
              {selected
                ? (questions.find((q) => String(q.key) === selected)?.label ?? selected)
                : t("metaInstantFormsMappingNone")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t("metaInstantFormsMappingNone")}</SelectItem>
            {questions.map((q) => {
              const key = String(q.key || "")
              return (
                <SelectItem key={key} value={key}>
                  <span className="block truncate">{q.label ?? key}</span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
    )
  }

  const enablePrimary = mode === "enable" || !form.enabled

  return (
    <ModalShell
      size="xl"
      title={t("metaInstantFormsMappingDialogTitle")}
      busy={busy}
      dismissible={!busy}
      onClose={onClose}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className={adminOutlineButtonClass}
            disabled={busy}
            onClick={onClose}
          >
            {t("noticeDismiss")}
          </Button>
          {needsRemap && danglingKeys.length === 0 ? (
            <Button
              type="button"
              variant="outline"
              className={adminOutlineButtonClass}
              disabled={busy}
              onClick={() => void onKeepAsIs()}
            >
              {t("metaInstantFormsRemapKeepAsIs")}
            </Button>
          ) : null}
          <Button type="button" disabled={busy} onClick={() => void handleSave(enablePrimary)}>
            {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {enablePrimary ? t("metaInstantFormsSaveAndEnable") : t("metaInstantFormsSaveMapping")}
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="min-w-0 max-w-full truncate rounded-lg border border-[#e8e0d8] bg-[#faf8f6] px-3 py-1.5 text-sm font-medium">
          {form.name}
        </span>
        <ArrowRightIcon className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm">
          <span className="truncate">
            {leadSheet?.templateName ?? t("metaInstantFormsMappingStandardSheet")}
          </span>
          {leadSheet?.isSystemDefault ? (
            <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium">
              {t("metaInstantFormsMappingStandardSheet")}
            </span>
          ) : null}
          {leadSheet?.isClientOwned ? (
            <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium">
              {t("webhookSheetClientOwned")}
            </span>
          ) : null}
        </span>
      </div>

      {needsRemap ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950"
        >
          <AlertTriangleIcon className="size-4 shrink-0 text-amber-700" aria-hidden />
          {t("metaInstantFormsRemapTitle")}
          {unmappedColumns.length > 0 ? (
            <span className="font-normal text-amber-900">
              {unmappedColumns.map((column) => column.label).join(", ")}
            </span>
          ) : null}
        </p>
      ) : null}

      {(validationError ?? error) ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
          role="alert"
        >
          {validationError ?? error}
        </p>
      ) : null}

      <div className="divide-y divide-[#efe8e0] overflow-hidden rounded-xl border border-[#e8e0d8]">
        {[
          ...META_CRM_FIELDS_ORDER.map((crmField) => ({
            target: crmField,
            title: t(META_CRM_FIELD_I18N[crmField].labelKey),
            tone: "core" as const,
          })),
          ...customFields.map((field) => ({
            target: metaCustomTarget(field.key),
            title: field.label,
            tone: "custom" as const,
          })),
        ]
          .sort((a, b) => Number(Boolean(mapping[b.target])) - Number(Boolean(mapping[a.target])))
          .map((row) => renderMappingRow(row.target, row.title, row.tone))}
      </div>

      {danglingKeys.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {danglingKeys.map((key) => (
            <button
              key={key}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-950"
              onClick={() => setCrmField(`${META_TARGET_PREFIX}${key}`, "")}
            >
              {key}
              <Trash2Icon className="size-3" aria-hidden />
              <span className="sr-only">{t("metaInstantFormsRemapRemoveMapping")}</span>
            </button>
          ))}
        </div>
      ) : null}

      {unmappedQuestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {t("metaInstantFormsMappingOtherQuestions")}
          </span>
          {unmappedQuestions.map((q) => (
            <span
              key={String(q.key)}
              className="rounded-full border border-[#e8e0d8] bg-[#faf8f6] px-2.5 py-0.5 text-xs"
            >
              {q.label ?? q.key}
            </span>
          ))}
        </div>
      ) : null}
    </ModalShell>
  )
}
