"use client"

import { useRef, useState } from "react"
import { ChevronDownIcon, CopyIcon } from "lucide-react"

import { MetaInstantFormsRealtimeSkeleton } from "@/components/admin/meta-instant-forms/MetaInstantFormsOverviewSkeleton"
import { adminOutlineButtonClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

type Props = {
  webhookUrl: string
  lastInboundAt: string | null
  busy?: boolean
  loading?: boolean
  defaultOpen?: boolean
}

export function MetaInstantFormsRealtimeSection({
  webhookUrl,
  lastInboundAt,
  busy = false,
  loading = false,
  defaultOpen = false,
}: Props) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(defaultOpen)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)

  async function copyUrl() {
    if (!webhookUrl) return
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setCopied(true)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <section className={cn(adminSectionCardClass, "overflow-hidden")}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-base font-semibold">{t("metaInstantFormsRealtimeSection")}</span>
        <ChevronDownIcon
          className={cn("size-5 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        loading ? (
          <MetaInstantFormsRealtimeSkeleton />
        ) : (
          <div className="space-y-3 border-t border-[#e8e0d8] px-4 py-4">
            <div
              className="rounded-xl border border-[#e8e0d8] bg-[#faf8f6] px-4 py-3"
              title={t("metaInstantFormsWebhookUrlHint")}
            >
              <p className="text-sm font-semibold text-foreground">
                {t("metaInstantFormsWebhookUrl")}
              </p>
              <div className="mt-2.5 flex min-w-0 items-center gap-2">
                <code
                  className="flex min-h-9 min-w-0 flex-1 items-center truncate rounded-lg border border-[#e8e0d8] bg-white px-3 py-2 font-mono text-sm text-foreground"
                  title={webhookUrl}
                >
                  {webhookUrl}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn("h-9 shrink-0 gap-1 px-2.5 text-xs", adminOutlineButtonClass)}
                  disabled={!webhookUrl || busy}
                  onClick={() => void copyUrl()}
                >
                  <CopyIcon className="size-3.5" />
                  {copied ? t("funnelCopied") : t("metaInstantFormsWebhookCopy")}
                </Button>
              </div>
            </div>

            {lastInboundAt ? (
              <p className="text-sm text-muted-foreground">
                {t("metaInstantFormsLastInbound")}: {new Date(lastInboundAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        )
      ) : null}
    </section>
  )
}
