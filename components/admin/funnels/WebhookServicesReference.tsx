"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { MessageKey } from "@/lib/i18n"
import type { WebhookServiceSpec } from "@/lib/lead-sheet/webhook-spec"
import { cn } from "cn"

const thClass = "px-3 py-2 text-left font-medium text-muted-foreground"
const tdClass = "px-3 py-2 align-top"

type Props = {
  services: readonly WebhookServiceSpec[]
  defaultOpen?: boolean
  /** When set, table is always visible (no disclosure). */
  flat?: boolean
  introKey?: MessageKey
}

/** Enabled client services and inbound aliases for webhook `serviceIds`. */
export function WebhookServicesReference({
  services,
  defaultOpen,
  flat = false,
  introKey = "webhookServicesIntro",
}: Props) {
  const { t, locale } = useLanguage()
  if (services.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{t("webhookServicesEmpty")}</p>
    )
  }

  const table = (
    <div className={cn("overflow-x-auto rounded-lg border border-[#e8e0d8]", flat ? "" : "mt-2")}>
      <table className="w-full min-w-[20rem] border-collapse text-xs">
        <thead className="bg-[#faf8f6]">
          <tr>
            <th className={thClass}>{t("webhookServicesColSendValue")}</th>
            <th className={thClass}>{t("webhookServicesColName")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#efe7de]">
          {services.map((service) => (
            <tr key={service.id}>
              <td className={cn(tdClass, "font-mono text-[12px] font-medium text-primary")}>
                {service.id}
              </td>
              <td className={tdClass}>
                {locale === "en" ? service.nameEn : service.nameDa}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  if (flat) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] leading-relaxed text-muted-foreground">{t(introKey)}</p>
        {table}
      </div>
    )
  }

  return (
    <details open={defaultOpen}>
      <summary className="cursor-pointer font-medium text-foreground">{t("webhookServicesTitle")}</summary>
      <p className="mt-2 text-xs text-muted-foreground">{t(introKey)}</p>
      {table}
    </details>
  )
}
