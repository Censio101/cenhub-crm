"use client"

import { useMemo } from "react"

import { ServiceExternalValueMap } from "@/components/admin/services/ServiceExternalValueMap"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { scanSampleServiceValues } from "@/lib/funnels/sample-service-values"
import type { ClientService, Service } from "@/lib/services/types"

type CatalogService = Pick<Service, "id" | "slug" | "nameDa" | "nameEn">

type Props = {
  slug: string
  sample: Record<string, unknown> | null
  serviceSourcePath: string | undefined
  catalog: readonly CatalogService[]
  enabledServices: readonly ClientService[]
  onSaved?: () => void
}

export function FunnelSampleServiceMap({
  slug,
  sample,
  serviceSourcePath,
  catalog,
  enabledServices,
  onSaved,
}: Props) {
  const { t } = useLanguage()
  const distinct = useMemo(
    () => scanSampleServiceValues(sample, serviceSourcePath),
    [sample, serviceSourcePath]
  )

  if (!serviceSourcePath?.trim()) {
    return (
      <p className="text-xs text-muted-foreground">{t("funnelSampleServiceMapNeedPath")}</p>
    )
  }

  if (!sample) {
    return (
      <p className="text-xs text-muted-foreground">{t("funnelSampleServiceMapNeedSample")}</p>
    )
  }

  if (distinct.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{t("funnelSampleServiceMapEmpty")}</p>
    )
  }

  return (
    <section className="space-y-3 rounded-2xl border border-[#e8e0d8] bg-[#faf8f6] p-4">
      <h4 className="text-sm font-semibold">{t("importServiceMappingHeading")}</h4>
      <ServiceExternalValueMap
        slug={slug}
        distinct={distinct}
        catalog={catalog}
        enabledServices={enabledServices}
        onSaved={onSaved}
        showSaveButton
      />
    </section>
  )
}
