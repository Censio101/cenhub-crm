"use client"

import { type ReactNode, useMemo, useState } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover"
import { cn } from "cn"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  onConfirm: () => void | Promise<void>
  trigger: ReactNode
}

export function LeadSheetBulkDeleteDialog({
  open,
  onOpenChange,
  count,
  onConfirm,
  trigger,
}: Props) {
  const { t } = useLanguage()
  const [typed, setTyped] = useState("")
  const [busy, setBusy] = useState(false)

  const confirmWord = t("leadSheetBulkDeleteConfirmWord")
  const canConfirm = typed.trim().toLowerCase() === confirmWord.toLowerCase()

  const description = useMemo(
    () => t("leadSheetBulkDeleteBody", { count: String(count) }),
    [count, t]
  )

  function close() {
    setTyped("")
    onOpenChange(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped("")
        onOpenChange(next)
      }}
    >
      {trigger}
      <PopoverContent align="end" className="z-[80] w-[min(22rem,calc(100vw-2rem))] gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>{t("leadSheetBulkDeleteTitle")}</PopoverTitle>
          <PopoverDescription>{description}</PopoverDescription>
        </PopoverHeader>
        <label className="block text-xs text-muted-foreground">
          {t("leadSheetBulkDeleteTypePrompt", { word: confirmWord })}
          <input
            type="text"
            value={typed}
            autoComplete="off"
            spellCheck={false}
            className={cn(
              "mt-1.5 flex h-9 w-full rounded-md border border-[#d9cfc3] bg-white px-2.5 text-sm outline-none",
              "focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/15"
            )}
            onChange={(e) => setTyped(e.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={close}>
            {t("leadSheetCancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!canConfirm || busy}
            onClick={() => {
              void (async () => {
                setBusy(true)
                try {
                  await onConfirm()
                  close()
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            {t("leadSheetBulkDeleteConfirm")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
