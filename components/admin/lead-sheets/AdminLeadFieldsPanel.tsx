"use client"

import { useCallback, useState } from "react"
import { LockIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { AdminListSkeleton } from "@/components/admin/AdminListSkeleton"
import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import {
  AddColumnDialog,
  type NewColumnValues,
} from "@/components/admin/lead-sheets/AddColumnDialog"
import {
  EditColumnDialog,
  type ColumnSettingsValues,
} from "@/components/admin/lead-sheets/EditColumnDialog"
import { FIELD_TYPE_ICONS, fieldTypeLabelKey } from "@/components/admin/lead-sheets/field-type-meta"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { FormNoticeStack } from "@/components/ui/form-notice"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import { builtinColumnLabelKey } from "@/lib/lead-sheet/lead-labels"
import {
  isLockedBuiltinKey,
  type CustomFieldType,
  type LeadSheetLibraryField,
} from "@/lib/lead-sheet/types"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { cn } from "cn"

type Dialog =
  | { kind: "create" }
  | { kind: "edit"; field: Extract<LeadSheetLibraryField, { kind: "custom" }> }
  | { kind: "delete"; field: Extract<LeadSheetLibraryField, { kind: "custom" }> }
  | null

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </h3>
  )
}

/** The field library: every field templates can pick from. */
export function AdminLeadFieldsPanel() {
  const { t } = useLanguage()
  const [fields, setFields] = useState<LeadSheetLibraryField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [deleting, setDeleting] = useState(false)
  /** Opt-in: also delete the field's saved values from leads. */
  const [purgeData, setPurgeData] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/lead-sheet-fields")
      if (!res.ok) throw new Error("load")
      const data = (await res.json()) as { fields: LeadSheetLibraryField[] }
      setFields(data.fields)
    } catch {
      setError(t("leadSheetsLoadError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useAsyncEffect(() => {
    void load()
  }, [load])

  const builtins = fields.filter(
    (f): f is Extract<LeadSheetLibraryField, { kind: "builtin" }> => f.kind === "builtin"
  )
  const customs = fields.filter(
    (f): f is Extract<LeadSheetLibraryField, { kind: "custom" }> => f.kind === "custom"
  )
  const customByType = new Map<string, typeof customs>()
  for (const field of customs) {
    const type = field.customField.fieldType
    const list = customByType.get(type) ?? []
    list.push(field)
    customByType.set(type, list)
  }

  /** Returns an error message for the dialog, or `null` when created. */
  async function createField(values: NewColumnValues): Promise<string | null> {
    try {
      const res = await fetch("/api/admin/lead-sheet-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: values.label,
          fieldType: values.fieldType,
          fieldKey: values.fieldKey,
          config: values.options ? { options: values.options } : undefined,
        }),
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed")
      setDialog(null)
      setNotice(t("leadFieldsCreated"))
      await load()
      return null
    } catch (e) {
      return e instanceof Error ? e.message : t("leadSheetsLoadError")
    }
  }

  async function saveField(id: string, values: ColumnSettingsValues): Promise<string | null> {
    try {
      const res = await fetch(`/api/admin/lead-sheet-fields/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed")
      setDialog(null)
      setNotice(t("leadSheetAssignmentSaved"))
      await load()
      return null
    } catch (e) {
      return e instanceof Error ? e.message : t("leadSheetsLoadError")
    }
  }

  async function confirmDelete(field: Extract<LeadSheetLibraryField, { kind: "custom" }>) {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/lead-sheet-fields/${field.customField.id}${purgeData ? "?purgeData=1" : ""}`,
        { method: "DELETE" }
      )
      const data = await readJson(res)
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed")
      setNotice(
        purgeData
          ? t("leadFieldsDeletedPurged").replace(
              "{count}",
              String(typeof data.purgedLeads === "number" ? data.purgedLeads : 0)
            )
          : t("leadFieldsDeleted")
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t("leadSheetsLoadError"))
    } finally {
      setDeleting(false)
      setDialog(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          {t("leadFieldsNav")}
          {!loading ? (
            <span className="rounded-full border border-[#e8e0d8] bg-[#faf8f6] px-2.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
              {fields.length}
            </span>
          ) : null}
        </h2>
        <Button type="button" className="gap-2" onClick={() => setDialog({ kind: "create" })}>
          <PlusIcon className="size-4" aria-hidden />
          {t("leadFieldsNew")}
        </Button>
      </div>

      <FormNoticeStack
        error={error}
        success={notice}
        onDismissError={() => setError(null)}
        onDismissSuccess={() => setNotice(null)}
        dismissLabel={t("noticeDismiss")}
        size={adminFormNoticeDefaults.size}
        successAutoDismissMs={adminFormNoticeDefaults.quickSuccessAutoDismissMs}
        errorAutoDismissMs={adminFormNoticeDefaults.errorAutoDismissMs}
      />

      {loading ? (
        <AdminListSkeleton rows={5} />
      ) : (
        <>
          <section className="space-y-2">
            <GroupLabel>{t("leadFieldsCustomHeading")}</GroupLabel>
            {customs.length === 0 ? (
              <button
                type="button"
                onClick={() => setDialog({ kind: "create" })}
                className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#d3c3b2] px-4 py-3.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-white hover:text-primary"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#faf8f6]">
                  <PlusIcon className="size-4" aria-hidden />
                </span>
                {t("leadFieldsCustomEmpty")}
              </button>
            ) : (
              <div className="space-y-4">
                {[...customByType.entries()].map(([type, typeFields]) => (
                  <div key={type}>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {t(fieldTypeLabelKey(type as CustomFieldType))}
                    </p>
                    <ul className="grid gap-2">
                      {typeFields.map((field) => {
                        const def = field.customField
                        const Icon = FIELD_TYPE_ICONS[def.fieldType]
                        return (
                          <li
                            key={def.id}
                            className={cn(
                              adminSectionCardClass,
                              "flex items-center gap-3 px-4 py-3"
                            )}
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                              <Icon className="size-4" aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold" title={def.label}>
                                {def.label}
                              </p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                                <span className="font-mono text-[11px]">{def.fieldKey}</span>
                              </p>
                            </div>
                            <span className="hidden shrink-0 rounded-full border border-[#e8e0d8] bg-[#faf8f6] px-2.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums sm:inline">
                              {t("leadFieldsUsedIn").replace(
                                "{count}",
                                String(field.templateCount)
                              )}
                            </span>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                title={t("leadFieldsEditTitle")}
                                aria-label={t("leadFieldsEditTitle")}
                                onClick={() => setDialog({ kind: "edit", field })}
                              >
                                <PencilIcon className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="hover:bg-red-50 hover:text-red-700"
                                title={t("leadFieldsDelete")}
                                aria-label={t("leadFieldsDelete")}
                                onClick={() => {
                                  setPurgeData(false)
                                  setDialog({ kind: "delete", field })
                                }}
                              >
                                <Trash2Icon className="size-4" />
                              </Button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <GroupLabel>{t("leadFieldsBuiltinHeading")}</GroupLabel>
            <ul className={cn(adminSectionCardClass, "divide-y divide-[#efe8e0] overflow-hidden")}>
              {builtins.map((field) => {
                const label = t(builtinColumnLabelKey(field.builtinKey))
                const core = isLockedBuiltinKey(field.builtinKey)
                const hint = core ? t("leadFieldsLocked") : t("leadFieldsStandardLocked")
                return (
                  <li key={field.builtinKey} className="flex items-center gap-3 px-4 py-2.5">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium" title={label}>
                      {label}
                    </p>
                    <span className="text-muted-foreground" title={hint} aria-label={hint}>
                      <LockIcon className="size-3.5" aria-hidden />
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}

      {dialog?.kind === "create" ? (
        <AddColumnDialog
          title={(type) => t("leadFieldsNewTitle").replace("{type}", type)}
          submitLabel={t("leadFieldsCreate")}
          onSubmit={createField}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog?.kind === "edit" ? (
        <EditColumnDialog
          key={dialog.field.customField.id}
          field={dialog.field.customField}
          title={t("leadFieldsEditTitle")}
          onSubmit={(values) => saveField(dialog.field.customField.id, values)}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog?.kind === "delete" ? (
        <ConfirmDialog
          destructive
          title={t("leadFieldsDeleteTitle").replace("{name}", dialog.field.customField.label)}
          message={`${t("leadFieldsDeleteBody")}${
            dialog.field.templateCount > 0
              ? ` ${t("leadFieldsDeleteUsed").replace("{count}", String(dialog.field.templateCount))}`
              : ""
          }`}
          confirmLabel={t("leadFieldsDelete")}
          busy={deleting}
          onConfirm={() => void confirmDelete(dialog.field)}
          onClose={() => setDialog(null)}
        >
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#d3c3b2] bg-[#faf8f6] px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--color-primary,#e4660c)]"
              checked={purgeData}
              disabled={deleting}
              onChange={(e) => setPurgeData(e.target.checked)}
            />
            <span>
              <span className="font-medium">{t("leadSheetsRemoveColumnPurge")}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t("leadFieldsPurgeHint")}
              </span>
            </span>
          </label>
        </ConfirmDialog>
      ) : null}
    </div>
  )
}
