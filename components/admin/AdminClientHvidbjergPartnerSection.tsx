"use client"

import { useState } from "react"
import { BadgeCheckIcon, PencilIcon } from "lucide-react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import { ModalShell } from "@/components/admin/ModalShell"
import {
  adminIconBoxClass,
  adminOutlineButtonClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { parseHvidbjergPartner } from "@/lib/hvidbjerg-partner"
import { cn } from "cn"

function PartnerSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-emerald-600" : "bg-[#d3c3b2]"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

export function AdminClientHvidbjergPartnerSection() {
  const { t } = useLanguage()
  const { slug, organization, reload } = useAdminClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!organization) return null

  const active = parseHvidbjergPartner(organization.hvidbjerg_partner)
  const statusLabel = active ? t("hvidbjergPartnerStatusYes") : t("hvidbjergPartnerStatusNo")

  function openDialog() {
    setDraft(active)
    setError(null)
    setDialogOpen(true)
  }

  function closeDialog() {
    if (saving) return
    setDialogOpen(false)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/hvidbjerg-partner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hvidbjergPartner: draft }),
      })
      const data = (await response.json()) as { error?: string; message?: string }
      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? t("hvidbjergPartnerSaveError"))
      }
      await reload({ silent: true })
      setDialogOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("hvidbjergPartnerSaveError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <section className={cn(adminSectionCardClass, "overflow-hidden")}>
        <div className="flex items-start gap-3 border-b border-[#e8e0d8] bg-[#faf8f6]/80 px-5 py-3.5">
          <span className={adminIconBoxClass("neutral")} aria-hidden="true">
            <BadgeCheckIcon className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-base font-semibold text-foreground">{t("hvidbjergPartnerSectionTitle")}</h2>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              {t("hvidbjergPartnerSectionSubtitle")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-[13px] font-semibold text-foreground">{t("hvidbjergPartnerFieldLabel")}</p>
            <p
              className={cn(
                "mt-1 text-sm font-medium",
                active ? "text-emerald-800" : "text-muted-foreground"
              )}
            >
              {statusLabel}
            </p>
          </div>
          <Button type="button" variant="outline" className={adminOutlineButtonClass} onClick={openDialog}>
            <PencilIcon className="size-4" aria-hidden="true" />
            {t("hvidbjergPartnerEdit")}
          </Button>
        </div>
      </section>

      {dialogOpen ? (
        <ModalShell
          title={t("hvidbjergPartnerDialogTitle")}
          subtitle={t("hvidbjergPartnerDialogLead")}
          busy={saving}
          dismissible={!saving}
          onClose={closeDialog}
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                className={adminOutlineButtonClass}
                disabled={saving}
                onClick={closeDialog}
              >
                {t("noticeDismiss")}
              </Button>
              <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                {saving ? t("hvidbjergPartnerSaving") : t("hvidbjergPartnerSave")}
              </Button>
            </>
          }
        >
          <div className="flex items-start justify-between gap-4 rounded-xl border border-[#e8e0d8] bg-white px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{t("hvidbjergPartnerToggleLabel")}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {t("hvidbjergPartnerToggleHint")}
              </p>
            </div>
            <PartnerSwitch
              checked={draft}
              disabled={saving}
              onChange={setDraft}
              label={t("hvidbjergPartnerToggleLabel")}
            />
          </div>
          {error ? (
            <p className="mt-3 text-sm text-danger-foreground" role="alert">
              {error}
            </p>
          ) : null}
        </ModalShell>
      ) : null}
    </>
  )
}
