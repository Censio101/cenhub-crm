"use client"

import { useEffect, useId, useRef } from "react"
import { XIcon } from "lucide-react"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

type Props = {
  title: string
  subtitle?: string
  /** Closes the dialog (Escape, X button, and backdrop click when `dismissible`). */
  onClose: () => void
  /** Backdrop click closes only when true — pass `false` while there are unsaved edits. */
  dismissible?: boolean
  /** While saving, all ways of closing are disabled. */
  busy?: boolean
  size?: "sm" | "md" | "lg" | "xl"
  children: React.ReactNode
  footer: React.ReactNode
}

/** Shared admin dialog: focus-safe Escape handling, body scroll lock, header + footer chrome. */
export function ModalShell({
  title,
  subtitle,
  onClose,
  dismissible = true,
  busy = false,
  size = "md",
  children,
  footer,
}: Props) {
  const { t } = useLanguage()
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  const busyRef = useRef(busy)

  useEffect(() => {
    onCloseRef.current = onClose
    busyRef.current = busy
  })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busyRef.current) onCloseRef.current()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c2723]/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible && !busy) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          adminSectionCardClass,
          "flex max-h-[90vh] w-full flex-col overflow-hidden",
          size === "sm"
            ? "max-w-md"
            : size === "lg"
              ? "max-w-2xl"
              : size === "xl"
                ? "max-w-4xl"
                : "max-w-xl"
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#e8dfd4] bg-[#faf8f6] px-5 py-3.5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            aria-label={t("leadSheetCancel")}
            onClick={onClose}
          >
            <XIcon className="size-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>

        <footer className="flex justify-end gap-2 border-t border-[#efe7de] bg-[#faf8f6] px-5 py-3">
          {footer}
        </footer>
      </div>
    </div>
  )
}
