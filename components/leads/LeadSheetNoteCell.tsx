"use client"

import { useState } from "react"
import { createPortal } from "react-dom"

import { adminOutlineButtonClass } from "@/components/admin/admin-ui-styles"
import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

const PREVIEW_MAX = 72

function previewText(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length <= PREVIEW_MAX) return trimmed
  return `${trimmed.slice(0, PREVIEW_MAX).trimEnd()}…`
}

type Props = {
  value: string
  fieldLabel: string
  leadName?: string
  onChange?: (next: string) => void
  readOnly?: boolean
}

export function LeadSheetNoteCell({
  value,
  fieldLabel,
  leadName,
  onChange,
  readOnly = false,
}: Props) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)

  function openEditor() {
    setDraft(value)
    setOpen(true)
  }

  function save() {
    onChange?.(draft)
    setOpen(false)
  }

  const hasText = value.trim().length > 0

  return (
    <>
      <div
        className="flex min-h-8 max-w-[14rem] items-center gap-1.5"
        data-lead-sheet-no-pan="true"
      >
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-sm leading-snug",
            hasText ? "text-[var(--text-primary)]" : "text-muted-foreground/60"
          )}
          title={hasText ? value : undefined}
        >
          {hasText ? previewText(value) : t("leadSheetNoteEmpty")}
        </p>
        {hasText || !readOnly ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("h-7 shrink-0 px-2.5 text-xs", adminOutlineButtonClass)}
            onClick={openEditor}
          >
            {hasText ? t("leadSheetNoteView") : t("leadSheetNoteAdd")}
          </Button>
        ) : null}
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <ModalShell
              title={fieldLabel}
              subtitle={leadName}
              size="lg"
              onClose={() => setOpen(false)}
              footer={
                <div className="flex w-full justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={adminOutlineButtonClass}
                    onClick={() => setOpen(false)}
                  >
                    {readOnly ? t("leadSheetNoteClose") : t("leadSheetCancel")}
                  </Button>
                  {!readOnly ? (
                    <Button type="button" onClick={save}>
                      {t("leadSheetNoteSave")}
                    </Button>
                  ) : null}
                </div>
              }
            >
              <textarea
                value={draft}
                rows={10}
                readOnly={readOnly}
                autoFocus
                className="w-full resize-y rounded-xl border border-[#e0d7cc] bg-white px-3 py-2.5 text-[15px] leading-relaxed text-[var(--text-primary)] outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 read-only:cursor-default read-only:bg-white"
                placeholder={t("leadSheetNotePlaceholder")}
                onChange={(e) => setDraft(e.target.value)}
              />
            </ModalShell>,
            document.body
          )
        : null}
    </>
  )
}
