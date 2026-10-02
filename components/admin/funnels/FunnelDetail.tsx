"use client"

import { useMemo, useState } from "react"
import { FlaskConicalIcon, PlugIcon, ShuffleIcon, Trash2Icon } from "lucide-react"

import { AdminPillTabs } from "@/components/admin/AdminPillTabs"
import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { FunnelFieldsTab, type FunnelFormat } from "@/components/admin/funnels/FunnelFieldsTab"
import { FunnelSetupTab } from "@/components/admin/funnels/FunnelSetupTab"
import { FunnelTestTab } from "@/components/admin/funnels/FunnelTestTab"
import type { FunnelDto } from "@/components/admin/funnels/types"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { useFunnelSample } from "@/hooks/useFunnelSample"
import { STANDARD_WEBHOOK_FIELDS, type WebhookLeadSheetInfo } from "@/lib/lead-sheet/webhook-spec"
import { flattenPayloadPaths } from "@/lib/leads/payload-paths"
import { cn } from "cn"

type Tab = "connect" | "fields" | "test"

type Props = {
  slug: string
  funnel: FunnelDto
  url: string
  leadSheet: WebhookLeadSheetInfo | null
  copiedKey: string | null
  onCopy: (key: string, value: string) => void
  onRegenerateSecret: () => void
  onFunnelChange: (patch: Partial<FunnelDto>) => void
  onToggleEnabled: (enabled: boolean) => void
  onDelete: () => void
}

function platformLabel(
  platform: FunnelDto["platform"],
  t: (key: "funnelPlatformWebsite" | "funnelPlatformLanding" | "funnelPlatformManual") => string
) {
  if (platform === "landing") return t("funnelPlatformLanding")
  if (platform === "manual") return t("funnelPlatformManual")
  return t("funnelPlatformWebsite")
}

/**
 * The big view of one webhook: a header (name, on/off, delete) and three tabs in the order an
 * admin works through them: Connect, Fields, Test.
 */
export function FunnelDetail({
  slug,
  funnel,
  url,
  leadSheet,
  copiedKey,
  onCopy,
  onRegenerateSecret,
  onFunnelChange,
  onToggleEnabled,
  onDelete,
}: Props) {
  const { t } = useLanguage()
  const [tab, setTab] = useState<Tab>("connect")
  const customFields = useMemo(() => leadSheet?.customFields ?? [], [leadSheet])
  const mappedCount = Object.values(funnel.fieldMapping).filter((v) => v.trim()).length

  // The chosen format is saved on the webhook, so it stays as it was left. Switching never
  // deletes the sample or the mapping; "our format" simply ignores them.
  const format: FunnelFormat = funnel.dataFormat
  const [formatError, setFormatError] = useState(false)

  const sampleApi = useFunnelSample(slug, funnel.id, onFunnelChange)
  const { state } = sampleApi
  const { paths, truncated } = useMemo(
    () => (state.sample ? flattenPayloadPaths(state.sample) : { paths: [], truncated: false }),
    [state.sample]
  )
  // Until the sample has loaded, what the page list already knows is used, so nothing flickers.
  const sampleLoading = !state.loaded && (funnel.hasSample || funnel.listeningSeconds !== null)
  const listening = state.loaded ? state.listeningEndsAt !== null : funnel.listeningSeconds !== null
  const totalTargets = STANDARD_WEBHOOK_FIELDS.length + customFields.length

  async function chooseFormat(next: FunnelFormat) {
    if (next === format) return
    setFormatError(false)
    const previous = { dataFormat: funnel.dataFormat, listeningSeconds: funnel.listeningSeconds }
    onFunnelChange({
      dataFormat: next,
      ...(next === "ours" ? { listeningSeconds: null } : {}),
    })
    try {
      const response = await fetch(`/api/admin/organizations/${slug}/funnels/${funnel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataFormat: next }),
      })
      if (!response.ok) throw new Error("format")
      // Leaving the funnel page format stops a running wait on the server too.
      if (next === "ours") await sampleApi.refresh()
    } catch {
      onFunnelChange(previous)
      setFormatError(true)
    }
  }

  const fieldsDot: "ok" | "wait" =
    format === "ours" ? "ok" : listening ? "wait" : mappedCount > 0 ? "ok" : "wait"

  const summary =
    format === "ours"
      ? t("funnelFormatOurs")
      : listening
        ? t("funnelStatusWaiting")
        : t("funnelStatusMapped")
            .replace("{mapped}", String(mappedCount))
            .replace("{total}", String(totalTargets))

  return (
    <section className={cn(adminSectionCardClass, "overflow-hidden")}>
      <header className="flex flex-wrap items-start gap-3 border-b border-[#efe7de] px-4 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-semibold tracking-tight" title={funnel.name}>
            {funnel.name}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {platformLabel(funnel.platform, t)} · {summary}
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
          {t("funnelEnabled")}
          <button
            type="button"
            role="switch"
            aria-checked={funnel.enabled}
            onClick={() => onToggleEnabled(!funnel.enabled)}
            className={cn(
              "relative h-6 w-10 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
              funnel.enabled ? "bg-primary" : "bg-[#d9cfc3]"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
                funnel.enabled && "translate-x-4"
              )}
            />
          </button>
        </label>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:bg-red-50 hover:text-red-700"
          title={t("funnelDelete")}
          aria-label={t("funnelDelete")}
          onClick={onDelete}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </header>

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <AdminPillTabs
          value={tab}
          onChange={setTab}
          options={[
            { id: "connect", label: t("funnelStepConnect"), step: 1, icon: PlugIcon },
            {
              id: "fields",
              label: t("funnelTabFields"),
              step: 2,
              dot: fieldsDot,
              icon: ShuffleIcon,
            },
            { id: "test", label: t("funnelStepTest"), step: 3, icon: FlaskConicalIcon },
          ]}
        />

        <div
          key={tab}
          className="animate-in fade-in-0 slide-in-from-bottom-1 rounded-xl border border-[#efe7de] bg-[#faf8f6] p-4 duration-200 sm:p-5"
        >
          {tab === "connect" ? (
            <FunnelSetupTab
              funnel={funnel}
              url={url}
              customFields={customFields}
              copiedKey={copiedKey}
              onCopy={onCopy}
              onRegenerateSecret={onRegenerateSecret}
            />
          ) : tab === "fields" ? (
            <FunnelFieldsTab
              slug={slug}
              funnel={funnel}
              url={url}
              leadSheet={leadSheet}
              customFields={customFields}
              format={format}
              onChooseFormat={(next) => void chooseFormat(next)}
              formatError={formatError}
              sampleApi={sampleApi}
              sampleLoading={sampleLoading}
              fieldCount={paths.length}
              truncated={truncated}
              copiedKey={copiedKey}
              onCopy={onCopy}
              onMappingSaved={(mapping) => onFunnelChange({ fieldMapping: mapping })}
            />
          ) : (
            <FunnelTestTab
              slug={slug}
              funnel={funnel}
              format={format}
              customFields={customFields}
              sample={state.sample}
              sampleLoading={sampleLoading}
            />
          )}
        </div>
      </div>
    </section>
  )
}
