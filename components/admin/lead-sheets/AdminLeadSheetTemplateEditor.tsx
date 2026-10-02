"use client"

import Link from "next/link"
import { Suspense, useMemo, useRef, useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { SearchIcon } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import {
  AddFieldToTemplateDialog,
  type FieldRef,
} from "@/components/admin/lead-sheets/AddFieldToTemplateDialog"
import type { NewColumnValues } from "@/components/admin/lead-sheets/NewColumnForm"
import { LeadSheetTemplateEditorSkeleton } from "@/components/admin/lead-sheets/LeadSheetsPanelSkeletons"
import {
  SortableLeadSheetColumnRow,
  StaticLeadSheetColumnRow,
  type LeadSheetColumn,
} from "@/components/admin/lead-sheets/LeadSheetColumnRow"
import {
  TemplateDetailsDialog,
  type TemplateDetailsValues,
} from "@/components/admin/lead-sheets/TemplateDetailsDialog"
import { TemplateSummaryCard } from "@/components/admin/lead-sheets/TemplateSummaryCard"
import { adminOutlineButtonClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { FormNoticeStack } from "@/components/ui/form-notice"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import { invalidateLeadSheetsTemplatesCache } from "@/lib/data/lead-sheets-hub-cache"
import { isColumnLocked } from "@/lib/lead-sheet/client-visibility"
import { columnDisplayLabel } from "@/lib/lead-sheet/column-display-label"
import { formatClientNames } from "@/components/admin/lead-sheets/template-usage"
import type {
  BusinessCategory,
  LeadSheetCustomFieldDef,
  ResolvedLeadSheetConfig,
  TemplateClientRef,
} from "@/lib/lead-sheet/types"
import { cn } from "cn"

type Props = {
  templateId: string
  initial: ResolvedLeadSheetConfig
  categories: BusinessCategory[]
  clientSlug?: string | null
  /** When set, back link from client-context banner uses this href. */
  clientBackHref?: string | null
  /** Hide workspace chrome; used on `/admin/clients/.../lead-sheet/custom`. */
  embeddedInClientSettings?: boolean
  /** Clients on this template — drives "Used by" and shared-change warnings. */
  usageClients?: TemplateClientRef[]
}

/** Parses a JSON error body without throwing on empty / non-JSON responses. */
async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function EditorContent({
  templateId,
  initial,
  categories,
  clientSlug,
  clientBackHref,
  embeddedInClientSettings,
  usageClients,
}: Props) {
  const { t } = useLanguage()
  const [config, setConfig] = useState(initial)
  const sharedClients = config.template.organizationId ? undefined : usageClients
  const [detailsOpen, setDetailsOpen] = useState(false)
  const isSystemDefault = config.template.isSystemDefault
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [columnSearch, setColumnSearch] = useState("")
  const [addAfterId, setAddAfterId] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<LeadSheetColumn | null>(null)
  /** Column ids with a request in flight — only those rows are disabled. */
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set())
  /** Counts in-flight reorder requests so late responses don't undo a newer drag. */
  const orderRequestSeq = useRef(0)
  const pendingOrders = useRef(0)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const columnIds = useMemo(() => config.columns.map((c) => c.id), [config.columns])
  const usedBuiltinKeys = useMemo(
    () => new Set(config.columns.flatMap((c) => (c.kind === "builtin" ? [c.builtinKey] : []))),
    [config.columns]
  )
  const usedCustomFieldIds = useMemo(
    () => new Set(config.columns.flatMap((c) => (c.kind === "custom" ? [c.customField.id] : []))),
    [config.columns]
  )

  const filteredColumns = useMemo(() => {
    const q = columnSearch.trim().toLowerCase()
    if (!q) return config.columns
    return config.columns.filter((col) => columnDisplayLabel(col, t).toLowerCase().includes(q))
  }, [config.columns, columnSearch, t])

  function setRowBusy(id: string, isBusy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (isBusy) next.add(id)
      else next.delete(id)
      return next
    })
  }

  /** Applies a server response, keeping the local order while a drag is still saving. */
  function applyServerConfig(data: ResolvedLeadSheetConfig) {
    if (pendingOrders.current === 0) {
      setConfig(data)
      return
    }
    setConfig((prev) => {
      const position = new Map(prev.columns.map((c, i) => [c.id, i]))
      const columns = [...data.columns].sort(
        (a, b) => (position.get(a.id) ?? Infinity) - (position.get(b.id) ?? Infinity)
      )
      return { ...data, columns }
    })
  }

  async function patchTemplate(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/lead-sheet-templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error("patch")
    return (await res.json()) as ResolvedLeadSheetConfig
  }

  /** Saves name and industry tags in one request. Returns an error message or `null`. */
  async function saveDetails(values: TemplateDetailsValues): Promise<string | null> {
    try {
      const data = await patchTemplate({
        ...(isSystemDefault ? {} : { name: values.name }),
        categoryIds: values.categoryIds,
      })
      applyServerConfig(data)
      invalidateLeadSheetsTemplatesCache()
      setDetailsOpen(false)
      setNotice(t("leadSheetAssignmentSaved"))
      return null
    } catch {
      return t("leadSheetsLoadError")
    }
  }

  /** Shows or hides a column on the client dashboard for everyone on this template. */
  async function toggleHidden(col: LeadSheetColumn) {
    setRowBusy(col.id, true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/lead-sheet-templates/${templateId}/columns/${col.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenForClient: !col.hiddenForClient }),
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed")
      applyServerConfig(data as unknown as ResolvedLeadSheetConfig)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("leadSheetsLoadError"))
    } finally {
      setRowBusy(col.id, false)
    }
  }

  /** Optimistic: the list already shows the new order; revert if the save fails. */
  async function saveOrder(previous: ResolvedLeadSheetConfig["columns"], nextIds: string[]) {
    const seq = ++orderRequestSeq.current
    pendingOrders.current += 1
    try {
      const res = await fetch(`/api/admin/lead-sheet-templates/${templateId}/columns`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedColumnIds: nextIds }),
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed")
      // If a newer drag is still saving, its response is the authoritative one.
      if (seq === orderRequestSeq.current) {
        setConfig(data as unknown as ResolvedLeadSheetConfig)
      }
    } catch (e) {
      if (seq === orderRequestSeq.current) {
        setConfig((prev) => ({ ...prev, columns: previous }))
      }
      setError(e instanceof Error ? e.message : t("leadSheetsLoadError"))
    } finally {
      pendingOrders.current -= 1
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = columnIds.indexOf(String(active.id))
    const newIndex = columnIds.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    const previous = config.columns
    const nextColumns = arrayMove(previous, oldIndex, newIndex)
    setConfig({ ...config, columns: nextColumns })
    void saveOrder(
      previous,
      nextColumns.map((c) => c.id)
    )
  }

  const allowInlineFieldCreate =
    embeddedInClientSettings || Boolean(config.template.organizationId)

  /** Returns an error message for the dialog, or `null` when the field was added. */
  async function addFieldAfter(afterColumnId: string, field: FieldRef): Promise<string | null> {
    try {
      const res = await fetch(`/api/admin/lead-sheet-templates/${templateId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afterColumnId, ...field }),
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed")
      applyServerConfig(data as unknown as ResolvedLeadSheetConfig)
      setAddAfterId(null)
      setNotice(t("leadSheetsFieldAdded"))
      return null
    } catch (e) {
      return e instanceof Error ? e.message : t("leadSheetsLoadError")
    }
  }

  async function createFieldAndAdd(
    afterColumnId: string,
    values: NewColumnValues
  ): Promise<string | null> {
    try {
      const createRes = await fetch("/api/admin/lead-sheet-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: values.label,
          fieldType: values.fieldType,
          fieldKey: values.fieldKey,
          config: values.options ? { options: values.options } : undefined,
        }),
      })
      const createData = await readJson(createRes)
      if (!createRes.ok) {
        const code = createData.code
        if (code === "field_key_taken") {
          return t("leadSheetsFieldKeyTaken")
        }
        throw new Error(typeof createData.error === "string" ? createData.error : "Failed")
      }
      const field = (createData as { field: LeadSheetCustomFieldDef }).field
      return addFieldAfter(afterColumnId, { customFieldId: field.id })
    } catch (e) {
      return e instanceof Error ? e.message : t("leadSheetsLoadError")
    }
  }

  async function confirmRemove() {
    const target = removeTarget
    if (!target) return
    setRowBusy(target.id, true)
    try {
      const res = await fetch(
        `/api/admin/lead-sheet-templates/${templateId}/columns/${target.id}`,
        {
          method: "DELETE",
        }
      )
      const data = await readJson(res)
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed")
      applyServerConfig(data as unknown as ResolvedLeadSheetConfig)
      setNotice(t("leadSheetsColumnRemoved"))
    } catch (e) {
      setError(e instanceof Error ? e.message : t("leadSheetsLoadError"))
    } finally {
      setRowBusy(target.id, false)
      setRemoveTarget(null)
    }
  }

  /** The Standard template's field set is fixed; the five core fields are in every template. */
  function canRemoveColumn(col: LeadSheetColumn) {
    return !isSystemDefault && !isColumnLocked(col)
  }

  function rowProps(col: LeadSheetColumn) {
    return {
      col,
      busy: busyIds.has(col.id),
      canRemove: canRemoveColumn(col),
      canAdd: !isSystemDefault,
      canToggleHidden: !config.template.organizationId,
      onAddAfter: () => setAddAfterId(col.id),
      onRemove: () => setRemoveTarget(col),
      onToggleHidden: () => void toggleHidden(col),
    }
  }

  const addAfterColumn = addAfterId ? config.columns.find((c) => c.id === addAfterId) : null

  const backHref =
    clientBackHref ?? (clientSlug ? adminClientSettingsSectionPath(clientSlug, "lead-sheet") : null)

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6",
        embeddedInClientSettings ? "max-w-none" : "max-w-4xl"
      )}
    >
      {clientSlug && !embeddedInClientSettings ? (
        <div
          className={cn(
            adminSectionCardClass,
            "flex flex-col gap-2 border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          )}
        >
          <p className="text-sm text-foreground">{t("leadSheetsEditorClientContextBanner")}</p>
          {backHref ? (
            <Link
              href={backHref}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm font-medium",
                adminOutlineButtonClass
              )}
            >
              {t("leadSheetsEditorBackToClientLeadSheet")}
            </Link>
          ) : null}
        </div>
      ) : null}

      <TemplateSummaryCard
        name={config.template.name}
        categoryIds={config.template.categoryIds ?? []}
        categories={categories}
        isSystemDefault={isSystemDefault}
        usageCount={sharedClients?.length}
        headingAs={embeddedInClientSettings ? "h2" : "h1"}
        onEdit={() => setDetailsOpen(true)}
      />

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

      <section className="space-y-3" aria-labelledby="lead-sheet-columns-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2
              id="lead-sheet-columns-heading"
              className="flex items-center gap-2 text-sm font-semibold"
            >
              {t("leadSheetsEditorColumns")}
              <span className="rounded-full bg-[#f3ebe3] px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {config.columns.length}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              {columnSearch.trim()
                ? t("leadSheetsEditorColumnsReorderPaused")
                : t("leadSheetDragToReorder")}
            </p>
          </div>
          <label className="relative block w-full sm:w-64">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              className="h-9 w-full rounded-xl border border-[#d3c3b2] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"
              placeholder={t("leadSheetsEditorColumnsSearch")}
              value={columnSearch}
              onChange={(e) => setColumnSearch(e.target.value)}
            />
          </label>
        </div>

        <div className="space-y-2">
          {columnSearch.trim() && filteredColumns.length === 0 ? (
            <p
              className={cn(
                adminSectionCardClass,
                "px-4 py-6 text-center text-sm text-muted-foreground"
              )}
            >
              {t("leadSheetsEditorColumnsSearchEmpty")}
            </p>
          ) : null}
          {columnSearch.trim() ? (
            <div className="grid gap-2">
              {filteredColumns.map((col) => (
                <StaticLeadSheetColumnRow key={col.id} {...rowProps(col)} />
              ))}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={columnIds} strategy={verticalListSortingStrategy}>
                <div className="grid gap-2">
                  {config.columns.map((col) => (
                    <SortableLeadSheetColumnRow key={col.id} {...rowProps(col)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </section>

      {detailsOpen ? (
        <TemplateDetailsDialog
          initial={{
            name: config.template.name,
            categoryIds: config.template.categoryIds ?? [],
          }}
          categories={categories}
          isSystemDefault={isSystemDefault}
          onSave={saveDetails}
          onClose={() => setDetailsOpen(false)}
        />
      ) : null}

      {addAfterColumn ? (
        <AddFieldToTemplateDialog
          usedBuiltinKeys={usedBuiltinKeys}
          usedCustomFieldIds={usedCustomFieldIds}
          allowInlineCreate={allowInlineFieldCreate}
          sharedNote={
            sharedClients && sharedClients.length > 0
              ? t("leadSheetsSharedAddNote").replace(
                  "{clients}",
                  formatClientNames(sharedClients, t)
                )
              : null
          }
          onPick={(field) => addFieldAfter(addAfterColumn.id, field)}
          onCreateAndAdd={(values) => createFieldAndAdd(addAfterColumn.id, values)}
          onClose={() => setAddAfterId(null)}
        />
      ) : null}

      {removeTarget ? (
        <ConfirmDialog
          destructive
          title={t("leadSheetsRemoveColumnTitle").replace(
            "{name}",
            columnDisplayLabel(removeTarget, t)
          )}
          message={
            sharedClients && sharedClients.length > 0
              ? `${t("leadSheetsRemoveColumnBody")} ${t("leadSheetsSharedRemoveNote").replace(
                  "{clients}",
                  formatClientNames(sharedClients, t)
                )}`
              : t("leadSheetsRemoveColumnBody")
          }
          confirmLabel={t("leadSheetsRemoveColumn")}
          busy={busyIds.has(removeTarget.id)}
          onConfirm={() => void confirmRemove()}
          onClose={() => setRemoveTarget(null)}
        />
      ) : null}
    </div>
  )
}

export function AdminLeadSheetTemplateEditor(props: Props) {
  const { t } = useLanguage()
  return (
    <Suspense
      fallback={
        <>
          <p className="sr-only">{t("leadSheetsLoading")}</p>
          <LeadSheetTemplateEditorSkeleton
            embedded={props.embeddedInClientSettings}
            showClientBanner={Boolean(props.clientSlug) && !props.embeddedInClientSettings}
          />
        </>
      }
    >
      <EditorContent {...props} />
    </Suspense>
  )
}
