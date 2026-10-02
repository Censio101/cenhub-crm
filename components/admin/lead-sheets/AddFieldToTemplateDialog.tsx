"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { InfoIcon, Loader2Icon, PlusIcon, SearchIcon } from "lucide-react"

import { AdminPillTabs } from "@/components/admin/AdminPillTabs"
import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import { FIELD_TYPE_ICONS, fieldTypeLabelKey } from "@/components/admin/lead-sheets/field-type-meta"
import {
  NewColumnForm,
  useNewColumnForm,
  type NewColumnValues,
} from "@/components/admin/lead-sheets/NewColumnForm"
import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { builtinColumnLabelKey } from "@/lib/lead-sheet/lead-labels"
import type { LeadSheetLibraryField } from "@/lib/lead-sheet/types"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { cn } from "cn"

export type FieldRef = { builtinKey: string } | { customFieldId: string }

type Tab = "library" | "new"

type Props = {
  usedBuiltinKeys: ReadonlySet<string>
  usedCustomFieldIds: ReadonlySet<string>
  sharedNote?: string | null
  /** Client-owned sheet: pick from library or create a new field in this dialog. */
  allowInlineCreate?: boolean
  onPick: (field: FieldRef) => Promise<string | null>
  onCreateAndAdd?: (values: NewColumnValues) => Promise<string | null>
  onClose: () => void
}

function fieldKeyOf(field: LeadSheetLibraryField): string {
  return field.kind === "builtin" ? `builtin:${field.builtinKey}` : field.customField.id
}

export function AddFieldToTemplateDialog({
  usedBuiltinKeys,
  usedCustomFieldIds,
  sharedNote,
  allowInlineCreate = false,
  onPick,
  onCreateAndAdd,
  onClose,
}: Props) {
  const { t } = useLanguage()
  const [tab, setTab] = useState<Tab>("library")
  const [fields, setFields] = useState<LeadSheetLibraryField[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [search, setSearch] = useState("")
  const [pickingKey, setPickingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const createForm = useNewColumnForm()

  useAsyncEffect(async (signal) => {
    try {
      const res = await fetch("/api/admin/lead-sheet-fields")
      if (!res.ok) throw new Error("load")
      const data = (await res.json()) as { fields: LeadSheetLibraryField[] }
      if (!signal.cancelled) setFields(data.fields)
    } catch {
      if (!signal.cancelled) setLoadFailed(true)
    }
  }, [])

  const available = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (fields ?? [])
      .filter((field) =>
        field.kind === "builtin"
          ? !usedBuiltinKeys.has(field.builtinKey)
          : !usedCustomFieldIds.has(field.customField.id)
      )
      .map((field) => ({
        field,
        label:
          field.kind === "builtin"
            ? t(builtinColumnLabelKey(field.builtinKey))
            : field.customField.label,
      }))
      .filter((item) => !q || item.label.toLowerCase().includes(q))
  }, [fields, search, usedBuiltinKeys, usedCustomFieldIds, t])

  const libraryBusy = pickingKey !== null
  const createBusy = createForm.saving
  const busy = libraryBusy || createBusy
  const showTabs = allowInlineCreate && Boolean(onCreateAndAdd)

  async function pick(field: LeadSheetLibraryField) {
    if (libraryBusy) return
    setPickingKey(fieldKeyOf(field))
    setError(null)
    const message = await onPick(
      field.kind === "builtin"
        ? { builtinKey: field.builtinKey }
        : { customFieldId: field.customField.id }
    )
    if (message) {
      setError(message)
      setPickingKey(null)
    }
  }

  async function submitCreate() {
    if (!onCreateAndAdd || !createForm.canSubmit) return
    createForm.setSaving(true)
    createForm.setError(null)
    const message = await onCreateAndAdd(createForm.values())
    if (message) {
      createForm.setError(message)
      createForm.setSaving(false)
    }
  }

  const dismissible =
    tab === "library"
      ? !libraryBusy && !search.trim()
      : createForm.pristine && !createBusy

  return (
    <ModalShell
      size={showTabs ? "lg" : "md"}
      title={t("leadSheetsAddFieldTitle")}
      busy={busy}
      dismissible={dismissible}
      onClose={onClose}
      footer={
        <>
          {!showTabs ? (
            <Link
              href="/admin/lead-sheets/fields"
              className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              <PlusIcon className="size-3.5" aria-hidden />
              {t("leadSheetsAddFieldCreate")}
            </Link>
          ) : null}
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            {t("leadSheetCancel")}
          </Button>
          {showTabs && tab === "new" ? (
            <Button type="button" disabled={!createForm.canSubmit} onClick={() => void submitCreate()}>
              {createBusy ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {t("leadSheetsAddColumn")}
            </Button>
          ) : null}
        </>
      }
    >
      {showTabs ? (
        <AdminPillTabs
          value={tab}
          onChange={setTab}
          options={[
            { id: "library", label: t("leadSheetsAddFieldTabLibrary") },
            { id: "new", label: t("leadSheetsAddFieldTabNew") },
          ]}
          className="mb-1"
        />
      ) : null}

      {tab === "library" || !showTabs ? (
        <>
          <label className="relative block">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              autoFocus={!showTabs}
              className={cn(adminFieldClass, "h-10 pl-9")}
              placeholder={t("leadSheetsEditorColumnsSearch")}
              value={search}
              disabled={libraryBusy}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          {loadFailed ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {t("leadSheetsLoadError")}
            </p>
          ) : fields === null ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="skeleton-shimmer h-11 rounded-xl" />
              ))}
            </div>
          ) : available.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {showTabs ? (
                <>
                  {t("leadSheetsAddFieldEmpty")}{" "}
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    onClick={() => setTab("new")}
                  >
                    {t("leadSheetsAddFieldTabNew")}
                  </button>
                </>
              ) : (
                t("leadSheetsAddFieldEmpty")
              )}
            </p>
          ) : (
            <ul className="grid max-h-80 gap-1.5 overflow-y-auto">
              {available.map(({ field, label }) => {
                const key = fieldKeyOf(field)
                const Icon =
                  field.kind === "custom" ? FIELD_TYPE_ICONS[field.customField.fieldType] : null
                return (
                  <li key={key}>
                    <button
                      type="button"
                      disabled={libraryBusy}
                      onClick={() => void pick(field)}
                      className="flex w-full items-center gap-3 rounded-xl border border-[#e2d6c8] bg-white px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{label}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          {Icon ? <Icon className="size-3" aria-hidden /> : null}
                          {field.kind === "builtin"
                            ? t("leadSheetBuiltinColumn")
                            : t(fieldTypeLabelKey(field.customField.fieldType))}
                        </span>
                      </span>
                      {pickingKey === key ? (
                        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <PlusIcon className="size-4 text-muted-foreground" aria-hidden />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : (
        <NewColumnForm
          form={createForm}
          sharedNote={sharedNote}
          autoFocus
          fieldKeyId="template-add-column-field-key"
          onEnterSubmit={() => void submitCreate()}
        />
      )}

      {tab === "library" && sharedNote ? (
        <p className="flex items-start gap-2 rounded-lg border border-[#d3c3b2] bg-[#faf8f6] px-3 py-2 text-xs text-muted-foreground">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {sharedNote}
        </p>
      ) : null}

      {tab === "library" && error ? (
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
