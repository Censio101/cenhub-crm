"use client"

import { useEffect, useState } from "react"
import { Loader2Icon } from "lucide-react"

import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import type { ServiceIdsEditor } from "@/lib/lead-sheet/types"
import { cn } from "cn"

type Props = {
  editor: ServiceIdsEditor
  busy: boolean
  onClose: () => void
  onSave: (editor: ServiceIdsEditor) => void | Promise<void>
}

const MODES = ["picker", "text"] as const satisfies readonly ServiceIdsEditor[]

/** Services column: how inbound values are shown and edited on the lead sheet. */
export function ServiceIdsEditorDialog({ editor, busy, onClose, onSave }: Props) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState<ServiceIdsEditor>(editor)

  useEffect(() => {
    setDraft(editor)
  }, [editor])

  const dirty = draft !== editor
  const canSave = dirty && !busy

  const hintKey = draft === "picker" ? "leadSheetsServiceIdsEditorPickerHint" : "leadSheetsServiceIdsEditorTextHint"

  return (
    <ModalShell
      title={t("leadSheetsServiceIdsEditorDialogTitle")}
      subtitle={t("leadSheetsServiceIdsEditorDialogSubtitle")}
      onClose={onClose}
      dismissible={!dirty}
      busy={busy}
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            {t("leadSheetCancel")}
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => void Promise.resolve(onSave(draft))}
          >
            {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {t("leadSheetSaveAssignment")}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2.5" role="group" aria-label={t("leadSheetsServiceIdsEditorLabel")}>
        {MODES.map((mode) => {
          const selected = draft === mode
          return (
            <button
              key={mode}
              type="button"
              disabled={busy}
              aria-pressed={selected}
              className={cn(
                "flex min-h-[4.25rem] flex-col items-center justify-center rounded-xl border-2 px-3 py-3 text-center transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                selected
                  ? mode === "picker"
                    ? "border-primary bg-primary/12 text-primary shadow-sm"
                    : "border-[#c9a227] bg-[#fdf4e3] text-[#8a5a08] shadow-sm"
                  : "border-[#e0d5c8] bg-white text-muted-foreground hover:border-[#c9b8a5] hover:text-foreground"
              )}
              onClick={() => setDraft(mode)}
            >
              <span className="text-[15px] font-semibold leading-tight">
                {mode === "picker"
                  ? t("leadSheetsServiceIdsEditorPicker")
                  : t("leadSheetsServiceIdsEditorText")}
              </span>
              <span className={cn("mt-1 text-[11px] font-normal leading-snug", selected ? "opacity-90" : "opacity-70")}>
                {mode === "picker"
                  ? t("leadSheetsServiceIdsEditorPickerShort")
                  : t("leadSheetsServiceIdsEditorTextShort")}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">{t(hintKey)}</p>
    </ModalShell>
  )
}
