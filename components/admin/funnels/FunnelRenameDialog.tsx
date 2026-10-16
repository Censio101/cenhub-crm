"use client"

import { FormEvent, useState } from "react"
import { Loader2Icon } from "lucide-react"

import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"

type Props = {
  initialName: string
  onSave: (name: string) => Promise<string | null>
  onClose: () => void
}

export function FunnelRenameDialog({ initialName, onSave, onClose }: Props) {
  const { t } = useLanguage()
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || saving) return
    if (trimmed === initialName.trim()) {
      onClose()
      return
    }
    setSaving(true)
    setError(null)
    const message = await onSave(trimmed)
    if (message) {
      setError(message)
      setSaving(false)
    }
  }

  return (
    <ModalShell
      size="sm"
      title={t("funnelRenameTitle")}
      busy={saving}
      dismissible={!saving}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
            {t("leadSheetCancel")}
          </Button>
          <Button type="submit" form="rename-funnel-form" disabled={saving || !name.trim()}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {t("funnelSave")}
          </Button>
        </>
      }
    >
      <form id="rename-funnel-form" className="grid gap-4" onSubmit={(e) => void submit(e)}>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">{t("funnelsSourceNameLabel")}</span>
          <input
            className={adminFieldClass}
            value={name}
            autoFocus
            maxLength={80}
            placeholder={t("funnelsSourceNamePlaceholder")}
            disabled={saving}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </ModalShell>
  )
}
