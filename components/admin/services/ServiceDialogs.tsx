"use client"

import { useState } from "react"
import { Loader2Icon } from "lucide-react"

import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { SERVICE_NAME_MAX } from "@/lib/services/types"
import { cn } from "cn"

type Props = {
  title: string
  submitLabel: string
  initialDa?: string
  initialEn?: string
  /** Resolve with an error message to show inline, or `null` when saved. */
  onSubmit: (nameDa: string, nameEn: string) => Promise<string | null>
  onClose: () => void
}

/** Create or rename a service. Mount only while open so the draft resets. */
export function ServiceNameDialog({
  title,
  submitLabel,
  initialDa = "",
  initialEn = "",
  onSubmit,
  onClose,
}: Props) {
  const { t } = useLanguage()
  const [nameDa, setNameDa] = useState(initialDa)
  const [nameEn, setNameEn] = useState(initialEn)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const da = nameDa.trim()
  const en = nameEn.trim()
  const unchanged = da === initialDa.trim() && en === initialEn.trim()
  const canSubmit = da.length > 0 && !unchanged && !saving

  async function submit() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    const message = await onSubmit(da, en)
    if (message) {
      setError(message)
      setSaving(false)
    }
  }

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <ModalShell
      title={title}
      size="sm"
      onClose={onClose}
      dismissible={unchanged}
      busy={saving}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
            {t("leadSheetCancel")}
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => void submit()}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {submitLabel}
          </Button>
        </>
      }
    >
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">{t("servicesNameDa")}</span>
        <input
          autoFocus
          className={cn(adminFieldClass, "h-10")}
          value={nameDa}
          maxLength={SERVICE_NAME_MAX}
          disabled={saving}
          placeholder={t("servicesNamePlaceholder")}
          onChange={(e) => setNameDa(e.target.value)}
          onKeyDown={onEnter}
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">{t("servicesNameEn")}</span>
        <input
          className={cn(adminFieldClass, "h-10")}
          value={nameEn}
          maxLength={SERVICE_NAME_MAX}
          disabled={saving}
          onChange={(e) => setNameEn(e.target.value)}
          onKeyDown={onEnter}
        />
        <span className="text-xs text-muted-foreground">{t("servicesNameEnHint")}</span>
      </label>
      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </ModalShell>
  )
}
