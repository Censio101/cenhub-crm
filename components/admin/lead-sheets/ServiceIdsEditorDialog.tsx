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

/** Services column: how inbound values are shown and edited on the lead sheet. */
export function ServiceIdsEditorDialog({ editor, busy, onClose, onSave }: Props) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState<ServiceIdsEditor>(editor)

  useEffect(() => {
    setDraft(editor)
  }, [editor])

  const dirty = draft !== editor
  const canSave = dirty && !busy

  return (
    <ModalShell
      title={t("leadSheetsServiceIdsEditorDialogTitle")}
      onClose={onClose}
      dismissible={!dirty}
      busy={busy}
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
      <p className="text-sm text-muted-foreground">{t("leadSheetsServiceIdsEditorDialogLead")}</p>
      <p className="mt-3 text-xs font-medium text-muted-foreground">
        {t("leadSheetsServiceIdsEditorCurrent", {
          mode:
            editor === "picker"
              ? t("leadSheetsServiceIdsEditorPicker")
              : t("leadSheetsServiceIdsEditorText"),
        })}
      </p>
      <div
        className="mt-2 inline-flex w-full rounded-lg border border-[#e0d5c8] bg-[#faf8f6] p-1"
        role="group"
        aria-label={t("leadSheetsServiceIdsEditorLabel")}
      >
        {(["picker", "text"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={busy}
            aria-pressed={draft === mode}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              draft === mode
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setDraft(mode)}
          >
            {mode === "picker"
              ? t("leadSheetsServiceIdsEditorPicker")
              : t("leadSheetsServiceIdsEditorText")}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {draft === "picker"
          ? t("leadSheetsServiceIdsEditorPickerBody")
          : t("leadSheetsServiceIdsEditorTextBody")}
      </p>
      <p className="mt-3 rounded-lg border border-[#e8e0d8] bg-[#faf8f6] px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {t("leadSheetsServiceIdsEditorPreserved")}
      </p>
    </ModalShell>
  )
}
