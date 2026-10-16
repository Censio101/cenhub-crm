"use client"

import { useMemo, useState } from "react"
import { Loader2Icon } from "lucide-react"

import { ModalShell } from "@/components/admin/ModalShell"
import { fieldTypeLabelKey } from "@/components/admin/lead-sheets/field-type-meta"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { FUNNEL_TARGET_PREFIX } from "@/lib/lead-sheet/mapping-review"
import {
  allEligibleWebhookTargets,
  effectiveWebhookFields,
} from "@/lib/lead-sheet/webhook-fields"
import {
  STANDARD_WEBHOOK_FIELDS,
  webhookStandardFieldMapLabel,
  type WebhookLeadSheetInfo,
} from "@/lib/lead-sheet/webhook-spec"
import { cn } from "cn"

type Props = {
  leadSheet: WebhookLeadSheetInfo
  initialTargets: string[] | null
  onSave: (targets: string[] | null) => Promise<string | null>
  onClose: () => void
}

function targetChecked(selected: Set<string>, target: string) {
  return selected.has(target)
}

export function FunnelWebhookFieldsDialog({
  leadSheet,
  initialTargets,
  onSave,
  onClose,
}: Props) {
  const { t } = useLanguage()
  const eligible = useMemo(() => allEligibleWebhookTargets(leadSheet), [leadSheet])
  const initialSelected = useMemo(() => {
    const effective = effectiveWebhookFields(leadSheet, initialTargets)
    const set = new Set<string>([
      ...effective.standardFieldKeys,
      ...effective.customFields.map((f) => `${FUNNEL_TARGET_PREFIX}${f.key}`),
    ])
    return set
  }, [initialTargets, leadSheet])

  const [selected, setSelected] = useState(() => new Set(initialSelected))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const standardOptions = useMemo(
    () =>
      STANDARD_WEBHOOK_FIELDS.filter((field) => leadSheet.standardFieldKeys.includes(field.key)),
    [leadSheet.standardFieldKeys]
  )

  function toggle(target: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(target)) next.delete(target)
      else next.add(target)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(eligible))
  }

  async function submit() {
    setSaving(true)
    setError(null)
    const list = eligible.filter((target) => selected.has(target))
    const useAll = list.length === eligible.length
    const message = await onSave(useAll ? null : list)
    if (message) {
      setError(message)
      setSaving(false)
    }
  }

  return (
    <ModalShell
      size="md"
      title={t("funnelWebhookFieldsTitle")}
      busy={saving}
      dismissible={!saving}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
            {t("leadSheetCancel")}
          </Button>
          <Button type="button" disabled={saving || selected.size === 0} onClick={() => void submit()}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {t("funnelSave")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <p className="text-sm text-muted-foreground">{t("funnelWebhookFieldsLead")}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={selectAll}>
            {t("funnelWebhookFieldsSelectAll")}
          </Button>
          <span className="self-center text-sm tabular-nums text-muted-foreground">
            {t("funnelWebhookFieldsCount", { count: selected.size, total: eligible.length })}
          </span>
        </div>

        <div className="max-h-[min(24rem,50vh)] space-y-4 overflow-y-auto rounded-xl border border-[#e8e0d8] bg-[#faf8f6] p-3">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("webhookStandardFields")}
            </p>
            <ul className="space-y-1">
              {standardOptions.map((field) => {
                const locked = field.key === "fullName" || field.key === "email" || field.key === "phone"
                return (
                  <li key={field.key}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white",
                        locked && "cursor-default opacity-80"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border"
                        checked={targetChecked(selected, field.key)}
                        disabled={saving || locked}
                        onChange={() => toggle(field.key)}
                      />
                      <span className="font-mono text-xs">{webhookStandardFieldMapLabel(field.key)}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>

          {leadSheet.customFields.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("webhookSheetFields")}
              </p>
              <ul className="space-y-1">
                {leadSheet.customFields.map((field) => {
                  const target = `${FUNNEL_TARGET_PREFIX}${field.key}`
                  return (
                    <li key={field.key}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-border"
                          checked={targetChecked(selected, target)}
                          disabled={saving}
                          onChange={() => toggle(target)}
                        />
                        <span className="min-w-0 flex-1 truncate">{field.label}</span>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {field.key}
                        </span>
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          {t(fieldTypeLabelKey(field.type))}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </ModalShell>
  )
}
