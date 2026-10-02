"use client"

import { Loader2Icon } from "lucide-react"

import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

type Props = {
  title: string
  message: string
  confirmLabel: string
  destructive?: boolean
  /** Extra content under the message, e.g. an opt-in checkbox. */
  children?: React.ReactNode
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

/** In-app replacement for `window.confirm`. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  destructive,
  children,
  busy,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useLanguage()
  return (
    <ModalShell
      size="sm"
      title={title}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            {t("leadSheetCancel")}
          </Button>
          <Button
            type="button"
            disabled={busy}
            autoFocus
            className={cn(destructive && "bg-red-600 text-white hover:bg-red-700")}
            onClick={onConfirm}
          >
            {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{message}</p>
      {children}
    </ModalShell>
  )
}
