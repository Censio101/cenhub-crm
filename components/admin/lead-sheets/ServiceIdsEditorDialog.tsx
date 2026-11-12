"use client"

import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import type { ServiceIdsEditor } from "@/lib/lead-sheet/types"
import { cn } from "cn"

type Props = {
  editor: ServiceIdsEditor
  busy: boolean
  onClose: () => void
  onApply: (editor: ServiceIdsEditor) => void
}

/** Services column: how inbound values are shown and edited on the lead sheet. */
export function ServiceIdsEditorDialog({ editor, busy, onClose, onApply }: Props) {
  const { t } = useLanguage()

  return (
    <ModalShell
      title={t("leadSheetsServiceIdsEditorDialogTitle")}
      onClose={onClose}
      busy={busy}
      footer={
        <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
          {t("leadSheetCancel")}
        </Button>
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
            aria-pressed={editor === mode}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              editor === mode
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              if (editor !== mode) onApply(mode)
            }}
          >
            {mode === "picker"
              ? t("leadSheetsServiceIdsEditorPicker")
              : t("leadSheetsServiceIdsEditorText")}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {editor === "picker"
          ? t("leadSheetsServiceIdsEditorPickerBody")
          : t("leadSheetsServiceIdsEditorTextBody")}
      </p>
      <p className="mt-3 rounded-lg border border-[#e8e0d8] bg-[#faf8f6] px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {t("leadSheetsServiceIdsEditorPreserved")}
      </p>
    </ModalShell>
  )
}
