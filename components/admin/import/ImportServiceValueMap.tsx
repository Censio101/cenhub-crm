"use client"

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react"

import {
  ServiceExternalValueMap,
  type ServiceExternalValueMapHandle,
} from "@/components/admin/services/ServiceExternalValueMap"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { scanDistinctImportServiceValues } from "@/lib/import/scan-service-values"
import type { ColumnMapping, ImportRowInput } from "@/lib/import/types"
import type { ClientService, Service } from "@/lib/services/types"

type CatalogService = Pick<Service, "id" | "slug" | "nameDa" | "nameEn">

export type ImportServiceMapHandle = {
  saveIfDirty: () => Promise<boolean>
}

type Props = {
  slug: string
  rows: ImportRowInput[]
  mapping: ColumnMapping
  catalog: CatalogService[]
  enabledServices: readonly ClientService[]
}

export const ImportServiceValueMap = forwardRef<ImportServiceMapHandle, Props>(
  function ImportServiceValueMap({ slug, rows, mapping, catalog, enabledServices }, ref) {
    const { t } = useLanguage()
    const innerRef = useRef<ServiceExternalValueMapHandle>(null)
    const mappedColumn = mapping.serviceIds?.[0]
    const distinct = useMemo(
      () => (mappedColumn ? scanDistinctImportServiceValues(rows, mapping) : []),
      [rows, mapping, mappedColumn]
    )

    useImperativeHandle(ref, () => ({
      saveIfDirty: () => innerRef.current?.saveIfDirty() ?? Promise.resolve(true),
    }))

    if (!mappedColumn) {
      return (
        <section className="space-y-3 rounded-2xl border border-[#e8e0d8] bg-[#faf8f6] p-4">
          <h4 className="text-sm font-semibold">{t("importServiceMappingHeading")}</h4>
          <p className="text-sm text-muted-foreground">{t("importServiceMapNeedColumn")}</p>
        </section>
      )
    }

    if (distinct.length === 0) {
      return (
        <section className="space-y-3 rounded-2xl border border-[#e8e0d8] bg-[#faf8f6] p-4">
          <h4 className="text-sm font-semibold">{t("importServiceMappingHeading")}</h4>
          <p className="text-sm text-muted-foreground">{t("importServiceMapNoValues")}</p>
        </section>
      )
    }

    return (
      <section className="space-y-3 rounded-2xl border border-[#e8e0d8] bg-[#faf8f6] p-4">
        <h4 className="text-sm font-semibold">{t("importServiceMappingHeading")}</h4>
        <ServiceExternalValueMap
          ref={innerRef}
          slug={slug}
          distinct={distinct}
          catalog={catalog}
          enabledServices={enabledServices}
          showSaveButton={false}
        />
      </section>
    )
  }
)
