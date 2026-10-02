"use client"

import Link from "next/link"
import { AlertTriangleIcon, FileSpreadsheetIcon, Loader2Icon } from "lucide-react"

import { adminOutlineButtonClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { DefaultTemplateBadge } from "@/components/admin/lead-sheets/DefaultTemplateBadge"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import type { WebhookLeadSheetInfo } from "@/lib/lead-sheet/webhook-spec"
import { cn } from "cn"

type Props = {
  slug: string
  leadSheet: WebhookLeadSheetInfo
}

/** Shown after the lead sheet changed while webhooks existed; cleared by an admin. */
export function FunnelStaleNotice({
  staleSince,
  busy,
  onAcknowledge,
}: {
  staleSince: string
  busy: boolean
  onAcknowledge: () => void
}) {
  const { t } = useLanguage()
  const date = new Date(staleSince)
  const formatted = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-950">{t("webhookStaleTitle")}</p>
          <p className="mt-0.5 text-sm text-amber-900">
            {t("webhookStaleBody").replace("{date}", formatted)}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 border-amber-400 bg-white text-amber-950 hover:bg-amber-100"
        disabled={busy}
        onClick={onAcknowledge}
      >
        {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
        {t("webhookStaleAcknowledge")}
      </Button>
    </div>
  )
}

/** Shows which lead sheet the webhook payload follows, with a link to change it. */
export function FunnelSheetBanner({ slug, leadSheet }: Props) {
  const { t } = useLanguage()
  const count = leadSheet.customFields.length

  return (
    <div
      className={cn(
        adminSectionCardClass,
        "flex flex-col gap-3 border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <FileSpreadsheetIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            {t("webhookSheetBannerTitle")}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-foreground">{leadSheet.templateName}</p>
            {leadSheet.isSystemDefault ? <DefaultTemplateBadge size="list" /> : null}
            {leadSheet.isClientOwned ? (
              <span className="inline-flex items-center rounded-full border border-[#d3c3b2] bg-white px-2.5 py-0.5 text-xs font-medium leading-5 text-foreground shadow-sm">
                {t("webhookSheetClientOwned")}
              </span>
            ) : null}
            <span className="text-xs text-muted-foreground">
              {count === 0
                ? t("webhookSheetNoCustom")
                : t("webhookSheetCustomCount").replace("{count}", String(count))}
            </span>
          </div>
        </div>
      </div>
      <Link
        href={adminClientSettingsSectionPath(slug, "lead-sheet")}
        className={cn(
          "inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium",
          adminOutlineButtonClass
        )}
      >
        {t("webhookSheetChange")}
      </Link>
    </div>
  )
}
