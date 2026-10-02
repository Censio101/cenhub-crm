"use client"

import { useState } from "react"
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  LinkIcon,
  RefreshCwIcon,
} from "lucide-react"

import { adminOutlineButtonClass } from "@/components/admin/admin-ui-styles"
import type { FunnelDto } from "@/components/admin/funnels/types"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { CANONICAL_INBOUND_EXAMPLE } from "@/lib/leads/inbound-payload"
import {
  buildCurlExample,
  buildExamplePayload,
  type WebhookCustomFieldSpec,
} from "@/lib/lead-sheet/webhook-spec"
import { cn } from "cn"

type Props = {
  funnel: FunnelDto
  url: string
  customFields: WebhookCustomFieldSpec[]
  copiedKey: string | null
  onCopy: (key: string, value: string) => void
  onRegenerateSecret: () => void
}

const readOnlyFieldClass =
  "min-w-0 flex-1 rounded-lg border border-[#e8e0d8] bg-[#faf8f5] px-3 py-2 font-mono text-xs text-foreground outline-none sm:text-[13px]"

const panelClass = "rounded-xl border border-[#e8e0d8] bg-white p-4 shadow-sm"

const iconActionClass = cn(
  "flex size-9 shrink-0 items-center justify-center rounded-lg border bg-white text-muted-foreground transition-colors",
  "hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none",
  "border-[#d3c3b2]"
)

/** Where the sender posts to, and the secret that proves it is the sender. */
export function FunnelSetupTab({
  funnel,
  url,
  customFields,
  copiedKey,
  onCopy,
  onRegenerateSecret,
}: Props) {
  const { t } = useLanguage()
  const [secretShown, setSecretShown] = useState(false)
  const urlCopyKey = `${funnel.id}-url`
  const secretCopyKey = `${funnel.id}-secret`
  const curlCopyKey = `${funnel.id}-connect-curl`
  const curl = buildCurlExample(
    url,
    funnel.webhookSecret,
    buildExamplePayload(CANONICAL_INBOUND_EXAMPLE as Record<string, unknown>, customFields)
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={panelClass}>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LinkIcon className="size-4" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-foreground">{t("funnelWebhookUrl")}</p>
          </div>
          <p className="mt-3 rounded-lg border border-[#efe7de] bg-[#faf8f5] px-3 py-2.5 font-mono text-[13px] leading-relaxed break-all text-foreground">
            {url}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={adminOutlineButtonClass}
              onClick={() => onCopy(urlCopyKey, url)}
            >
              {copiedKey === urlCopyKey ? (
                <CheckIcon className="size-4 text-emerald-600" aria-hidden />
              ) : (
                <CopyIcon className="size-4" aria-hidden />
              )}
              {copiedKey === urlCopyKey ? t("funnelCopied") : t("funnelCopyWebhook")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={adminOutlineButtonClass}
              onClick={() => onCopy(curlCopyKey, curl)}
            >
              {copiedKey === curlCopyKey ? (
                <CheckIcon className="size-4 text-emerald-600" aria-hidden />
              ) : (
                <CopyIcon className="size-4" aria-hidden />
              )}
              {copiedKey === curlCopyKey ? t("funnelCopied") : t("webhookCopyCurl")}
            </Button>
          </div>
        </div>

        <div className={panelClass}>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRoundIcon className="size-4" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-foreground">{t("funnelSecret")}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              readOnly
              className={readOnlyFieldClass}
              value={secretShown ? funnel.webhookSecret : "••••••••••••••••••••"}
              aria-label={t("funnelSecret")}
            />
            <button
              type="button"
              className={iconActionClass}
              aria-label={secretShown ? t("funnelSecretHide") : t("funnelSecretShow")}
              title={secretShown ? t("funnelSecretHide") : t("funnelSecretShow")}
              aria-pressed={secretShown}
              onClick={() => setSecretShown((shown) => !shown)}
            >
              {secretShown ? (
                <EyeOffIcon className="size-4" aria-hidden />
              ) : (
                <EyeIcon className="size-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              className={iconActionClass}
              aria-label={t("funnelCopySecret")}
              title={copiedKey === secretCopyKey ? t("funnelCopied") : t("funnelCopySecret")}
              onClick={() => onCopy(secretCopyKey, funnel.webhookSecret)}
            >
              {copiedKey === secretCopyKey ? (
                <CheckIcon className="size-4 text-emerald-600" aria-hidden />
              ) : (
                <CopyIcon className="size-4" aria-hidden />
              )}
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("mt-3", adminOutlineButtonClass)}
            onClick={onRegenerateSecret}
          >
            <RefreshCwIcon className="size-4" aria-hidden />
            {t("funnelRegenerateSecret")}
          </Button>
        </div>
      </div>
    </div>
  )
}
