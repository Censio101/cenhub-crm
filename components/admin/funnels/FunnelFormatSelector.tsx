"use client"

import { useState } from "react"
import { CheckIcon, ChevronDownIcon, FileJsonIcon, ShuffleIcon } from "lucide-react"

import { adminOutlineButtonClass } from "@/components/admin/admin-ui-styles"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { ModalShell } from "@/components/admin/ModalShell"
import type { FunnelFormat } from "@/components/admin/funnels/types"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

type Props = {
  format: FunnelFormat
  onChooseFormat: (format: FunnelFormat) => void
}

export function FunnelFormatSelector({ format, onChooseFormat }: Props) {
  const { t } = useLanguage()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pending, setPending] = useState<FunnelFormat | null>(null)

  const options: {
    id: FunnelFormat
    icon: typeof FileJsonIcon
    label: string
    hint: string
  }[] = [
    { id: "ours", icon: FileJsonIcon, label: t("funnelFormatOurs"), hint: t("funnelFormatOursHint") },
    { id: "own", icon: ShuffleIcon, label: t("funnelFormatOwn"), hint: t("funnelFormatOwnHint") },
  ]

  const current = options.find((o) => o.id === format) ?? options[0]
  const CurrentIcon = current.icon

  function pickInModal(next: FunnelFormat) {
    if (next === format) {
      setPickerOpen(false)
      return
    }
    setPickerOpen(false)
    setPending(next)
  }

  const pendingLabel = pending ? (options.find((o) => o.id === pending)?.label ?? "") : ""

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e8e0d8] bg-white px-3 py-2.5 shadow-sm sm:flex-nowrap">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CurrentIcon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground">{t("funnelFormatCurrentLabel")}</p>
          <p className="truncate text-sm font-semibold">{current.label}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(adminOutlineButtonClass, "shrink-0 gap-1")}
          onClick={() => setPickerOpen(true)}
        >
          {t("funnelFormatChange")}
          <ChevronDownIcon className="size-4 opacity-60" aria-hidden />
        </Button>
      </div>

      {pickerOpen ? (
        <ModalShell
          size="sm"
          title={t("funnelFormatChooseTitle")}
          onClose={() => setPickerOpen(false)}
          footer={
            <Button type="button" variant="ghost" onClick={() => setPickerOpen(false)}>
              {t("leadSheetCancel")}
            </Button>
          }
        >
          <ul className="space-y-2">
            {options.map((option) => {
              const Icon = option.icon
              const selected = format === option.id
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => pickInModal(option.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                      "hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none",
                      selected
                        ? "border-primary/40 bg-primary/[0.05]"
                        : "border-[#e8e0d8] bg-white"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        selected ? "bg-primary text-white" : "bg-[#f4efe9] text-muted-foreground"
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{option.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
                    </span>
                    {selected ? (
                      <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </ModalShell>
      ) : null}

      {pending ? (
        <ConfirmDialog
          destructive
          title={t("funnelFormatSwitchTitle")}
          message={t("funnelFormatSwitchShort")}
          confirmLabel={t("funnelFormatSwitchConfirm").replace("{format}", pendingLabel)}
          onConfirm={() => {
            onChooseFormat(pending)
            setPending(null)
          }}
          onClose={() => setPending(null)}
        />
      ) : null}
    </>
  )
}
