"use client"

import { FormEvent, useState } from "react"
import { Loader2Icon } from "lucide-react"

import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import { ModalShell } from "@/components/admin/ModalShell"
import type { FunnelDto } from "@/components/admin/funnels/types"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "cn"

type Props = {
  /** Resolves with an error message to show inline, or `null` once created. */
  onCreate: (input: { name: string; platform: FunnelDto["platform"] }) => Promise<string | null>
  onClose: () => void
}

/** Name and where the leads come from. The webhook opens ready to set up right after. */
export function NewFunnelDialog({ onCreate, onClose }: Props) {
  const { t } = useLanguage()
  const [name, setName] = useState("")
  const [platform, setPlatform] = useState<FunnelDto["platform"]>("website")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const platformLabel = (value: FunnelDto["platform"]) =>
    value === "landing"
      ? t("funnelPlatformLanding")
      : value === "manual"
        ? t("funnelPlatformManual")
        : t("funnelPlatformWebsite")

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    const message = await onCreate({ name: name.trim(), platform })
    // On success the page selects the new webhook and closes this popup.
    if (message) {
      setError(message)
      setSaving(false)
    }
  }

  return (
    <ModalShell
      size="sm"
      title={t("funnelNew")}
      busy={saving}
      dismissible={!saving}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
            {t("leadSheetCancel")}
          </Button>
          <Button type="submit" form="new-funnel-form" disabled={saving || !name.trim()}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {t("funnelCreate")}
          </Button>
        </>
      }
    >
      <form id="new-funnel-form" className="grid gap-4" onSubmit={(e) => void submit(e)}>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">{t("funnelsSourceNameLabel")}</span>
          <input
            className={adminFieldClass}
            value={name}
            autoFocus
            maxLength={80}
            disabled={saving}
            placeholder={t("funnelsSourceNamePlaceholder")}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">{t("funnelPlatform")}</span>
          <Select
            value={platform}
            onValueChange={(value) => {
              if (value === "website" || value === "landing" || value === "manual") {
                setPlatform(value)
              }
            }}
            disabled={saving}
          >
            <SelectTrigger className={cn(adminFieldClass, "w-full min-w-0")}>
              <SelectValue>{platformLabel(platform)}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger className="min-w-[var(--anchor-width)]">
              {(["website", "landing", "manual"] as const).map((value) => (
                <SelectItem key={value} value={value}>
                  {platformLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {error}
          </p>
        ) : null}
      </form>
    </ModalShell>
  )
}
