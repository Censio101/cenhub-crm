"use client"

import { CheckIcon, FileJsonIcon, ShuffleIcon } from "lucide-react"

import { FunnelFieldMapper } from "@/components/admin/funnels/FunnelFieldMapper"
import { FunnelPayloadDoc } from "@/components/admin/funnels/FunnelPayloadDoc"
import { FunnelSampleStep } from "@/components/admin/funnels/FunnelSampleStep"
import type { FunnelDto } from "@/components/admin/funnels/types"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { useFunnelSample } from "@/hooks/useFunnelSample"
import type { WebhookCustomFieldSpec, WebhookLeadSheetInfo } from "@/lib/lead-sheet/webhook-spec"
import { cn } from "cn"

export type FunnelFormat = "ours" | "own"

type Props = {
  slug: string
  funnel: FunnelDto
  url: string
  leadSheet: WebhookLeadSheetInfo | null
  customFields: WebhookCustomFieldSpec[]
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

  const options: { id: FunnelFormat; icon: typeof FileJsonIcon; title: string; hint: string }[] = [
    {
      id: "ours",
      icon: FileJsonIcon,
      title: t("funnelFormatOurs"),
      hint: t("funnelFormatOursHint"),
    },
    { id: "own", icon: ShuffleIcon, title: t("funnelFormatOwn"), hint: t("funnelFormatOwnHint") },
  ]

  const sectionClass = "rounded-xl border border-[#e8e0d8] bg-white p-4 shadow-sm sm:p-5"

  return (
    <div className="space-y-4">
      <div className={sectionClass}>
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => {
            const Icon = option.icon
            const selected = format === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChooseFormat(option.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none",
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-[#e2d6c8] bg-white hover:border-primary/50"
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    selected ? "bg-primary text-white" : "bg-[#f4efe9] text-muted-foreground"
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{option.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
                </span>
                {selected ? (
                  <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {formatError ? (
        <p role="alert" className="text-sm text-red-700">
          {t("funnelsLoadError")}
        </p>
      ) : null}

      {format === "ours" ? (
        <div className={cn(sectionClass, "space-y-4")}>
          <FunnelPayloadDoc
            funnelId={funnel.id}
            url={url}
            secret={funnel.webhookSecret}
            leadSheet={leadSheet}
            copiedKey={copiedKey}
            onCopy={onCopy}
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
          <section className={sectionClass}>
            <FunnelSampleStep
              state={state}
              enabled={funnel.enabled}
              fieldCount={fieldCount}
              truncated={truncated}
              actionError={sampleApi.actionError}
              onListen={() => void sampleApi.listen()}
              onStop={() => void sampleApi.stop()}
              onClear={() => void sampleApi.clear()}
            />
          </section>
          <section className={sectionClass}>
            <FunnelFieldMapper
              key={`${funnel.id}:${JSON.stringify(funnel.fieldMapping)}`}
              slug={slug}
              funnelId={funnel.id}
              savedMapping={funnel.fieldMapping}
              customFields={customFields}
              sample={state.sample}
              onSaved={onMappingSaved}
            />
          </section>
        </>
      )}
    </div>
  )
}
