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
  /** On phones the dialog fills the screen instead of floating with margins. */
  fullscreenOnMobile?: boolean
  /** Extra classes for the scrolling body (for example a background). */
  bodyClassName?: string
  /** Optional icon shown in a soft orange tile beside the title; also warms the header. */
  icon?: React.ReactNode
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
  fullscreenOnMobile = false,
  bodyClassName,
  icon,
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
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-[#2c2723]/55 backdrop-blur-[2px]",
        fullscreenOnMobile ? "p-0 sm:p-4" : "p-4"
      )}
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
          "flex w-full flex-col overflow-hidden",
          fullscreenOnMobile
            ? "h-dvh max-h-dvh rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-2xl"
            : "max-h-[90vh]",
          size === "sm"
            ? "max-w-md"
            : size === "lg"
              ? "max-w-2xl"
              : size === "xl"
                ? "max-w-4xl"
                : "max-w-xl"
        )}
      >
        <header
          className={cn(
            "flex items-center justify-between gap-3 border-b px-6 py-4",
            icon ? "border-[#e8dccb] bg-[#f9f5ef]" : "items-start border-[#ece4da] bg-[#faf8f6]"
          )}
        >
          <div className="flex min-w-0 items-center gap-3.5">
            {icon ? (
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fde6d2] text-primary [&_svg]:size-5"
                aria-hidden="true"
              >
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
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

        <div className={cn("min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5", bodyClassName)}>
          {children}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[#ece4da] bg-[#faf8f6] px-6 py-3.5">
          {footer}
        </footer>
      </div>
    </div>
  )
}
