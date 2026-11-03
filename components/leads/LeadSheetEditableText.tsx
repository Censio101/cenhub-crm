"use client"

import { useRef, useState } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  editableDisplayText,
  isUnchangedEdit,
  parseEditedValue,
  type EditableCellKind,
} from "@/lib/leads/editable-cell"
import { cn } from "cn"

const editInputClass =
  "h-8 w-full min-w-0 rounded-md border-0 bg-white px-1.5 text-sm outline-none ring-1 ring-ring select-text"

/**
 * A custom sheet cell that reads as plain text. Double-click (or Enter / F2 while it has focus)
 * turns it into a box; Enter or clicking away saves, Escape cancels.
 */
export function LeadSheetEditableText({
  value,
  kind,
  label,
  onCommit,
  className,
}: {
  value: unknown
  kind: EditableCellKind
  label: string
  onCommit: (next: string | number | null) => void
  className?: string
}) {
  const { t } = useLanguage()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  // Escape and Enter both blur the box; this stops that blur from saving a second time.
  const finished = useRef(false)

  const text = editableDisplayText(value)

  function startEditing() {
    finished.current = false
    setDraft(text)
    setEditing(true)
  }

  function finish(save: boolean) {
    if (finished.current) return
    finished.current = true
    setEditing(false)
    if (!save) return
    const result = parseEditedValue(kind, draft)
    if (result.ok && !isUnchangedEdit(value, result.value)) onCommit(result.value)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={kind === "number" ? "text" : kind}
        inputMode={kind === "number" ? "decimal" : undefined}
        aria-label={label}
        value={draft}
        className={editInputClass}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            finish(true)
          } else if (event.key === "Escape") {
            event.preventDefault()
            finish(false)
          }
        }}
      />
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${text || "–"}`}
      title={text ? `${text}\n${t("leadSheetEditCellHint")}` : t("leadSheetEditCellHint")}
      className={cn(
        "block min-h-8 w-full min-w-0 cursor-default truncate rounded-md px-1.5 py-1.5 text-sm text-foreground outline-none",
        "hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-primary/30",
        !text && "text-muted-foreground/60",
        kind === "number" && "tabular-nums",
        className
      )}
      onDoubleClick={startEditing}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === "F2") {
          event.preventDefault()
          startEditing()
        }
      }}
    >
      {text || "–"}
    </div>
  )
}
