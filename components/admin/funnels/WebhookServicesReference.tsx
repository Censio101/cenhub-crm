"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { WebhookServiceSpec } from "@/lib/lead-sheet/webhook-spec"
import { cn } from "cn"

const thClass = "px-3 py-2 text-left font-medium text-muted-foreground"
const tdClass = "px-3 py-2 align-top"

type Props = {
  services: readonly WebhookServiceSpec[]
  defaultOpen?: boolean
}

/** Enabled client services and inbound aliases for webhook `serviceIds`. */
export function WebhookServicesReference({ services, defaultOpen }: Props) {
  const { t, locale } = useLanguage()
  if (services.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{t("webhookServicesEmpty")}</p>
    )
  }

  return (
    <details open={defaultOpen}>
      <summary className="cursor-pointer font-medium text-foreground">{t("webhookServicesTitle")}</summary>
      <p className="mt-2 text-xs text-muted-foreground">{t("webhookServicesIntro")}</p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-[#e8e0d8]">
        <table className="w-full min-w-[32rem] border-collapse text-xs">
          <thead className="bg-[#faf8f6]">
            <tr>
              <th className={thClass}>{t("webhookServicesColId")}</th>
              <th className={thClass}>{t("webhookServicesColName")}</th>
              <th className={thClass}>{t("webhookServicesColAliases")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#efe7de]">
            {services.map((service) => (
              <tr key={service.id}>
                <td className={cn(tdClass, "font-mono text-[12px] text-foreground")}>{service.id}</td>
                <td className={tdClass}>
                  {locale === "en" ? service.nameEn : service.nameDa}
                </td>
                <td className={cn(tdClass, "text-muted-foreground")}>
                  {service.aliases.length > 0 ? service.aliases.join(", ") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
