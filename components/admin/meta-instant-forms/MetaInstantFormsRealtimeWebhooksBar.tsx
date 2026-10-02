"use client"

import { Loader2Icon } from "lucide-react"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

type Props = {
  canLoadForms: boolean
  hasEnabledForm: boolean
  subscribed: boolean | null
  checking: boolean
  busy: boolean
  onTurnOn: () => void
}

export function MetaInstantFormsRealtimeWebhooksBar({
  canLoadForms,
  hasEnabledForm,
  subscribed,
  checking,
  busy,
  onTurnOn,
}: Props) {
  const { t } = useLanguage()

  if (!canLoadForms) return null

  const isOn = subscribed === true
  const isChecking = checking || (subscribed === null && busy)

  return (
    <div
      className={cn(
        adminSectionCardClass,
        "flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        isOn ? "border-emerald-200/90 bg-emerald-50/40" : "border-[#e8e0d8] bg-[#faf8f6]"
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {t("metaInstantFormsSetupWebhooks")}
          </p>
          {isChecking ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e8e0d8] bg-white px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <Loader2Icon className="size-3 animate-spin" aria-hidden />
              {t("metaInstantFormsRealtimeWebhooksChecking")}
            </span>
          ) : isOn ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              <span className="size-1.5 rounded-full bg-white" aria-hidden />
              {t("metaInstantFormsRealtimeWebhooksOn")}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-950">
              {t("metaInstantFormsRealtimeWebhooksOff")}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {isOn
            ? t("metaInstantFormsRealtimeWebhooksHintOn")
            : hasEnabledForm
              ? t("metaInstantFormsRealtimeWebhooksHintOff")
              : t("metaInstantFormsRealtimeWebhooksNeedForm")}
        </p>
      </div>

      {!isOn && !isChecking ? (
        <Button
          type="button"
          size="sm"
          className="shrink-0 self-start sm:self-center"
          disabled={!hasEnabledForm || busy}
          onClick={onTurnOn}
        >
          {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {t("metaInstantFormsRealtimeWebhooksTurnOn")}
        </Button>
      ) : null}
    </div>
  )
}
