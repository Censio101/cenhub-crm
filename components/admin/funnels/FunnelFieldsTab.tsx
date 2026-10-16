"use client"

import { FunnelFieldMapper } from "@/components/admin/funnels/FunnelFieldMapper"
import { FunnelFormatSelector } from "@/components/admin/funnels/FunnelFormatSelector"
import { FunnelMakeHttpSample } from "@/components/admin/funnels/FunnelMakeHttpSample"
import { FunnelPayloadDoc } from "@/components/admin/funnels/FunnelPayloadDoc"
import { FunnelSampleStep } from "@/components/admin/funnels/FunnelSampleStep"
import type { FunnelDto, FunnelFormat } from "@/components/admin/funnels/types"
import { useLanguage } from "@/components/i18n/LanguageProvider"

export type { FunnelFormat }
import type { useFunnelSample } from "@/hooks/useFunnelSample"
import {
  buildExamplePayload,
  buildFilteredStandardInboundExample,
  buildMappingInboundExample,
  type WebhookCustomFieldSpec,
  type WebhookLeadSheetInfo,
  type WebhookServiceSpec,
} from "@/lib/lead-sheet/webhook-spec"
import type { ClientService } from "@/lib/services/types"
import { cn } from "cn"

type Props = {
  slug: string
  funnel: FunnelDto
  url: string
  leadSheet: WebhookLeadSheetInfo | null
  customFields: WebhookCustomFieldSpec[]
  standardFieldKeys: readonly string[]
  enabledServices: readonly ClientService[]
  webhookServices: readonly WebhookServiceSpec[]
  format: FunnelFormat
  onChooseFormat: (format: FunnelFormat) => void
  formatError: boolean
  sampleApi: ReturnType<typeof useFunnelSample>
  /** The sample is still loading: show a skeleton, not an empty sample step. */
  sampleLoading: boolean
  fieldCount: number
  truncated: boolean
  copiedKey: string | null
  onCopy: (key: string, value: string) => void
  onMappingSaved: (mapping: Record<string, string>) => void
}

/**
 * What the sender sends: either our field names (nothing to map), or its own names, in which
 * case a sample is captured and each field is mapped from it.
 */
export function FunnelFieldsTab({
  slug,
  funnel,
  url,
  leadSheet,
  customFields,
  standardFieldKeys,
  enabledServices,
  webhookServices,
  format,
  onChooseFormat,
  formatError,
  sampleApi,
  sampleLoading,
  fieldCount,
  truncated,
  copiedKey,
  onCopy,
  onMappingSaved,
}: Props) {
  const { t } = useLanguage()
  const { state } = sampleApi
  const sectionClass = "rounded-xl border border-[#e8e0d8] bg-white p-4 shadow-sm sm:p-5"
  const fixedPayload = buildExamplePayload(
    buildFilteredStandardInboundExample(enabledServices, standardFieldKeys),
    customFields
  )
  const mappingPayload = buildMappingInboundExample(enabledServices)

  return (
    <div className="space-y-3">
      <FunnelFormatSelector format={format} onChooseFormat={onChooseFormat} />

      {formatError ? (
        <p role="alert" className="text-sm text-red-700">
          {t("funnelsLoadError")}
        </p>
      ) : null}

      {format === "ours" ? (
        <div className={cn(sectionClass, "space-y-4")}>
          <FunnelMakeHttpSample
            funnelId={funnel.id}
            variant="fixed"
            url={url}
            secret={funnel.webhookSecret}
            payload={fixedPayload}
            copiedKey={copiedKey}
            onCopy={onCopy}
          />
          <FunnelPayloadDoc
            funnelId={funnel.id}
            url={url}
            secret={funnel.webhookSecret}
            leadSheet={leadSheet}
            standardFieldKeys={standardFieldKeys}
            customFields={customFields}
            enabledServices={enabledServices}
            webhookServices={webhookServices}
            copiedKey={copiedKey}
            onCopy={onCopy}
            referenceOnly
          />
        </div>
      ) : sampleLoading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="skeleton-shimmer h-20 w-full rounded-xl" />
          <div className="space-y-2.5">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="skeleton-shimmer h-9 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <section className={cn(sectionClass, "divide-y divide-[#ece4da] space-y-0")}>
            <div className="pb-3.5 sm:pb-4">
              <FunnelMakeHttpSample
                funnelId={funnel.id}
                variant="mapping"
                url={url}
                secret={funnel.webhookSecret}
                payload={mappingPayload}
                copiedKey={copiedKey}
                onCopy={onCopy}
                embedded
              />
            </div>
            <div className="pt-3.5 sm:pt-4">
              <FunnelSampleStep
                state={state}
                enabled={funnel.enabled}
                fieldCount={fieldCount}
                truncated={truncated}
                actionError={sampleApi.actionError}
                onListen={() => void sampleApi.listen()}
                onStop={() => void sampleApi.stop()}
                onClear={() => void sampleApi.clear()}
                embedded
              />
            </div>
          </section>
          <section className={sectionClass}>
            <h3 className="mb-4 text-sm font-semibold text-foreground">{t("funnelSectionMappingPlain")}</h3>
            <FunnelFieldMapper
              key={`${funnel.id}:${JSON.stringify(funnel.fieldMapping)}`}
              slug={slug}
              funnelId={funnel.id}
              savedMapping={funnel.fieldMapping}
              customFields={customFields}
              standardFieldKeys={standardFieldKeys}
              sample={state.sample}
              webhookServices={webhookServices}
              onSaved={onMappingSaved}
            />
          </section>
        </>
      )}
    </div>
  )
}
