"use client"

import { useEffect, useRef, useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  Loader2Icon,
  LockIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { FIELD_TYPE_ICONS, fieldTypeLabelKey } from "@/components/admin/lead-sheets/field-type-meta"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { isColumnLocked } from "@/lib/lead-sheet/client-visibility"
import { columnDisplayLabel } from "@/lib/lead-sheet/column-display-label"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import { cn } from "cn"

export type LeadSheetColumn = ResolvedLeadSheetConfig["columns"][number]

type RowProps = {
  col: LeadSheetColumn
  /** Only this row is disabled while its own request is in flight. */
  busy: boolean
  canRemove: boolean
  /** Show the "add a field after this one" button (not on the Standard template). */
  canAdd: boolean
  onAddAfter: () => void
  onRemove: () => void
  /** Hide this column from (or show it on) the client dashboard for everyone on the template. */
  onToggleHidden: () => void
  /** False for a client's own sheet: there, visibility is set in the client's "Shown to client" list. */
  canToggleHidden: boolean
}

type CardProps = RowProps & {
  leading: React.ReactNode
  cardRef?: (node: HTMLElement | null) => void
  style?: React.CSSProperties
  dragging?: boolean
}

const actionsClass = "flex shrink-0 items-center gap-0.5"

/** The key webhooks use for this column (`customFields.<key>`); click to copy. */
function FieldKeyChip({ fieldKey }: { fieldKey: string }) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
    },
    []
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(fieldKey)
    } catch {
      return
    }
    setCopied(true)
    if (timerRef.current != null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <span aria-hidden>·</span>
      <button
        type="button"
        title={t("webhookFieldKeyCopy")}
        aria-label={`${t("webhookFieldKeyCopy")}: ${fieldKey}`}
        className="inline-flex items-center gap-1 rounded px-1 font-mono text-[11px] hover:bg-[#f6efe7] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        onClick={() => void copy()}
      >
        {copied ? t("funnelCopied") : fieldKey}
        {copied ? (
          <CheckIcon className="size-3" aria-hidden />
        ) : (
          <CopyIcon className="size-3" aria-hidden />
        )}
      </button>
    </>
  )
}

function ColumnRowCard({
  col,
  busy,
  canRemove,
  canAdd,
  onAddAfter,
  onRemove,
  onToggleHidden,
  canToggleHidden,
  leading,
  cardRef,
  style,
  dragging,
}: CardProps) {
  const { t } = useLanguage()
  const label = columnDisplayLabel(col, t)
  const locked = isColumnLocked(col)
  const hidden = !locked && Boolean(col.hiddenForClient)
  const TypeIcon = col.kind === "custom" ? FIELD_TYPE_ICONS[col.customField.fieldType] : null

  return (
    <div
      ref={cardRef}
      style={style}
      className={cn(
        adminSectionCardClass,
        "group flex items-center gap-2 px-3 py-2.5 transition-colors hover:border-[#c9b8a5]",
        dragging && "z-10 opacity-90 shadow-md",
        busy && "opacity-70"
      )}
    >
      {leading}

      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", hidden && "text-muted-foreground")} title={label}>
          {label}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {TypeIcon ? <TypeIcon className="size-3" aria-hidden /> : null}
          {col.kind === "builtin"
            ? t("leadSheetBuiltinColumn")
            : t(fieldTypeLabelKey(col.customField.fieldType))}
          {col.kind === "custom" ? <FieldKeyChip fieldKey={col.customField.fieldKey} /> : null}
          {hidden ? (
            <span className="rounded bg-[#f3ebe3] px-1.5 py-px text-[10px] font-medium text-muted-foreground">
              {t("leadSheetsHiddenChip")}
            </span>
          ) : null}
        </p>
      </div>

      {busy ? (
        <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
      ) : (
        <div className={actionsClass}>
          {locked ? (
            <span
              className="flex size-7 items-center justify-center text-muted-foreground"
              title={t("leadFieldsLocked")}
              aria-label={t("leadFieldsLocked")}
            >
              <LockIcon className="size-3.5" aria-hidden />
            </span>
          ) : canToggleHidden ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={hidden ? t("leadSheetsShowToClient") : t("leadSheetsHideFromClient")}
              aria-label={hidden ? t("leadSheetsShowToClient") : t("leadSheetsHideFromClient")}
              aria-pressed={hidden}
              onClick={onToggleHidden}
            >
              {hidden ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </Button>
          ) : null}
          {canAdd ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={t("leadSheetsAddColumnAfter")}
              aria-label={t("leadSheetsAddColumnAfter")}
              onClick={onAddAfter}
            >
              <PlusIcon className="size-4" />
            </Button>
          ) : null}
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="hover:bg-red-50 hover:text-red-700"
              title={t("leadSheetsRemoveColumn")}
              aria-label={t("leadSheetsRemoveColumn")}
              onClick={onRemove}
            >
              <Trash2Icon className="size-4" />
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

/** Draggable row — must render inside a dnd-kit `SortableContext`. */
export function SortableLeadSheetColumnRow(props: RowProps) {
  const { t } = useLanguage()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.col.id,
    // Dragging a row that is mid-request would race with its own update.
    disabled: props.busy,
  })

  return (
    <ColumnRowCard
      {...props}
      cardRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
      leading={
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground disabled:cursor-default disabled:opacity-40"
          aria-label={t("leadSheetDragToReorder")}
          disabled={props.busy}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
      }
    />
  )
}

/** Non-draggable row used while the column search is active. */
export function StaticLeadSheetColumnRow(props: RowProps) {
  return <ColumnRowCard {...props} leading={<span className="w-4 shrink-0" aria-hidden />} />
}
