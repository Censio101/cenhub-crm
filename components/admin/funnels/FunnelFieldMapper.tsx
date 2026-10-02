"use client"

import { useMemo, useState } from "react"
import { AlertTriangleIcon, Loader2Icon, SparklesIcon, Trash2Icon } from "lucide-react"

import { adminOutlineButtonClass } from "@/components/admin/admin-ui-styles"
import { FunnelTestPanel } from "@/components/admin/funnels/FunnelTestPanel"
import { fieldTypeLabelKey } from "@/components/admin/lead-sheets/field-type-meta"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FUNNEL_TARGET_PREFIX, findDanglingCustomTargets } from "@/lib/lead-sheet/mapping-review"
import { STANDARD_WEBHOOK_FIELDS, type WebhookCustomFieldSpec } from "@/lib/lead-sheet/webhook-spec"
import { flattenPayloadPaths, suggestMappings, type PayloadPath } from "@/lib/leads/payload-paths"
import { getByPath } from "@/lib/leads/source-path"

type Mapping = Record<string, string>

type Props = {
  slug: string
  funnelId: string
  savedMapping: Mapping
  customFields: WebhookCustomFieldSpec[]
  /** The captured body, or null when there is none yet (paths can still be typed). */
  sample: Record<string, unknown> | null
  onSaved: (mapping: Mapping) => void
}

const NONE = "__none__"
const MANUAL = "__manual__"

const inputClass =
  "h-9 w-full rounded-lg border border-[#d3c3b2] bg-white px-2.5 font-mono text-xs outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

const RECOMMENDED = new Set(["fullName", "email", "phone"])

function cleaned(mapping: Mapping): Mapping {
  return Object.fromEntries(
    Object.entries(mapping)
      .map(([target, source]) => [target, source.trim()] as const)
      .filter(([, source]) => source.length > 0)
  )
}

function sameMapping(a: Mapping, b: Mapping) {
  const left = cleaned(a)
  const right = cleaned(b)
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  return [...keys].every((key) => left[key] === right[key])
}

/** Mount with a `key` that changes when the saved mapping changes, so the draft resets. */
export function FunnelFieldMapper({
  slug,
  funnelId,
  savedMapping,
  customFields,
  sample,
  onSaved,
}: Props) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState<Mapping>(() => ({ ...savedMapping }))
  const [manual, setManual] = useState<ReadonlySet<string>>(() => new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { paths, truncated } = useMemo(
    () => (sample ? flattenPayloadPaths(sample) : { paths: [] as PayloadPath[], truncated: false }),
    [sample]
  )
  const pathByKey = useMemo(() => new Map(paths.map((entry) => [entry.path, entry])), [paths])

  const targets = useMemo(
    () => [
      ...STANDARD_WEBHOOK_FIELDS.map((field) => ({ target: field.key, custom: null })),
      ...customFields.map((field) => ({
        target: `${FUNNEL_TARGET_PREFIX}${field.key}`,
        custom: field,
      })),
    ],
    [customFields]
  )

  const customKeys = useMemo(() => customFields.map((f) => f.key), [customFields])
  const danglingKeys = useMemo(
    () => findDanglingCustomTargets(draft, FUNNEL_TARGET_PREFIX, customKeys),
    [draft, customKeys]
  )
  const dirty = !sameMapping(draft, savedMapping)
  const endpoint = `/api/admin/organizations/${slug}/funnels/${funnelId}`

  function setSource(target: string, value: string) {
    setDraft((current) => ({ ...current, [target]: value }))
    setSaved(false)
    setError(null)
  }

  function removeTarget(target: string) {
    setDraft((current) => {
      const next = { ...current }
      delete next[target]
      return next
    })
    setSaved(false)
  }

  function autoMatch() {
    const suggestions = suggestMappings(
      paths,
      targets.map(({ target, custom }) => ({
        target,
        names: custom ? [custom.key, custom.label] : [],
      }))
    )
    setDraft((current) => {
      const next = { ...current }
      for (const [target, path] of Object.entries(suggestions)) {
        if (!(next[target] ?? "").trim()) next[target] = path
      }
      return next
    })
    setSaved(false)
    setError(null)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldMapping: cleaned(draft) }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        funnel?: { fieldMapping?: Mapping }
      }
      if (!response.ok) throw new Error(data.error ?? t("funnelsLoadError"))
      setSaved(true)
      onSaved(data.funnel?.fieldMapping ?? cleaned(draft))
    } catch (e) {
      setError(e instanceof Error ? e.message : t("funnelsLoadError"))
    } finally {
      setSaving(false)
    }
  }

  function valueBadges(entry: PayloadPath) {
    return (
      <>
        {entry.positional ? (
          <span className="rounded bg-amber-100 px-1 py-px text-[10px] font-medium text-amber-900">
            {t("funnelMapPositional")}
          </span>
        ) : null}
        {entry.type === "list" ? (
          <span className="rounded bg-[#f3ebe3] px-1 py-px text-[10px] font-medium text-muted-foreground">
            {t("funnelMapList")}
          </span>
        ) : null}
      </>
    )
  }

  function sourceControl(target: string, title: string) {
    const current = draft[target] ?? ""
    const listOk = target === "serviceIds"
    const known = current ? pathByKey.get(current) : undefined
    const typing = !sample || manual.has(target) || (current !== "" && !known)

    if (typing) {
      return (
        <input
          className={inputClass}
          value={current}
          placeholder={t("funnelMapPathPlaceholder")}
          spellCheck={false}
          autoComplete="off"
          aria-label={`${title}: ${t("funnelMapPathLabel")}`}
          onChange={(e) => setSource(target, e.target.value)}
        />
      )
    }

    return (
      <Select
        value={current || NONE}
        onValueChange={(value) => {
          if (value === MANUAL) {
            setManual((currentSet) => new Set(currentSet).add(target))
            return
          }
          setSource(target, value === NONE || value == null ? "" : String(value))
        }}
      >
        <SelectTrigger className="h-9 w-full min-w-0 rounded-lg border-[#d3c3b2] bg-white px-2.5 text-xs">
          <SelectValue>
            {known ? (
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-mono">{current}</span>
                <span className="truncate text-muted-foreground">
                  {known.preview || t("funnelMapEmpty")}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">{t("funnelMapNone")}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          align="start"
          className="max-h-80"
          style={{ minWidth: "max(var(--anchor-width), 22rem)", maxWidth: "calc(100vw - 2rem)" }}
        >
          <SelectItem value={NONE}>{t("funnelMapNone")}</SelectItem>
          {paths.map((entry) => {
            const blocked = entry.type === "list" && !listOk
            return (
              <SelectItem key={entry.path} value={entry.path} disabled={blocked}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-mono text-xs">{entry.path}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {entry.preview || t("funnelMapEmpty")}
                  </span>
                  {valueBadges(entry)}
                </span>
              </SelectItem>
            )
          })}
          <SelectItem value={MANUAL}>{t("funnelMapType")}</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  function row(target: string, title: string, hint?: string, recommended?: boolean) {
    const current = draft[target] ?? ""
    const value = current && sample ? getByPath(sample, current) : undefined
    // The sender's own key with the same name is read as it is, even when it is not mapped.
    const sameName = !current && sample ? pathByKey.get(target) : undefined
    return (
      <div
        key={target}
        className="grid gap-1.5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:items-start sm:gap-3"
      >
        <div className="min-w-0 pt-1.5">
          <p className="flex items-center gap-1.5 truncate font-mono text-[12px] text-foreground">
            {title}
            {recommended ? (
              <span className="rounded bg-primary/10 px-1 py-px font-sans text-[10px] font-medium text-primary">
                {t("webhookRecommended")}
              </span>
            ) : null}
          </p>
          {hint ? <p className="truncate text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="min-w-0 space-y-1">
          {sourceControl(target, title)}
          {sameName ? (
            <p className="truncate text-[11px] text-muted-foreground">
              {t("funnelMapSameName").replace("{path}", sameName.path)}
            </p>
          ) : null}
          {current && sample && value === undefined ? (
            <p className="text-[11px] text-amber-800">{t("funnelMapNotInSample")}</p>
          ) : null}
          {value !== null && typeof value === "object" && !Array.isArray(value) ? (
            <p className="text-[11px] text-amber-800">{t("funnelMapObjectValue")}</p>
          ) : null}
        </div>
      </div>
    )
  }

  const mappedCount = Object.keys(cleaned(draft)).length

  return (
    <div className="space-y-4 text-sm">
      {sample ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={adminOutlineButtonClass}
            onClick={autoMatch}
          >
            <SparklesIcon className="size-4" aria-hidden />
            {t("funnelMapAuto")}
          </Button>
        </div>
      ) : null}
      {truncated ? (
        <p className="text-xs text-muted-foreground">{t("funnelSampleTruncated")}</p>
      ) : null}

      <div className="space-y-2.5">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("webhookStandardFields")}
        </p>
        {STANDARD_WEBHOOK_FIELDS.map((field) =>
          row(field.key, field.key, undefined, RECOMMENDED.has(field.key))
        )}
      </div>

      {customFields.length > 0 ? (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("webhookSheetFields")}
          </p>
          {customFields.map((field) =>
            row(
              `${FUNNEL_TARGET_PREFIX}${field.key}`,
              `customFields.${field.key}`,
              `${field.label} · ${t(fieldTypeLabelKey(field.type))}`
            )
          )}
        </div>
      ) : null}

      {danglingKeys.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-950">
            <AlertTriangleIcon className="size-4 text-amber-700" aria-hidden />
            {t("funnelMappingRemovedHeading")}
          </p>
          <ul className="space-y-1.5">
            {danglingKeys.map((key) => {
              const target = `${FUNNEL_TARGET_PREFIX}${key}`
              return (
                <li key={target} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-mono text-xs text-amber-950">
                    {target} ← {draft[target]}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-amber-400 bg-white"
                    onClick={() => removeTarget(target)}
                  >
                    <Trash2Icon className="size-4" />
                    {t("funnelMappingRemove")}
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-2 rounded-xl border border-[#efe7de] bg-[#faf8f6] p-3.5">
        <p className="font-medium text-foreground">{t("funnelPreviewTitle")}</p>
        <FunnelTestPanel
          slug={slug}
          funnelId={funnelId}
          payload={sample}
          mapping={cleaned(draft)}
          allowPaste
        />
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-wrap items-center gap-2 border-t border-[#efe7de] bg-white/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:-mb-5 sm:px-5">
        <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {t("funnelMappingSave")}
        </Button>
        {dirty ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => setDraft({ ...savedMapping })}
          >
            {t("funnelMappingDiscard")}
          </Button>
        ) : null}
        <span role="status" className="ml-auto text-xs text-muted-foreground tabular-nums">
          {saved && !dirty
            ? t("funnelMappingSaved")
            : t("funnelStatusMapped")
                .replace("{mapped}", String(mappedCount))
                .replace("{total}", String(targets.length))}
        </span>
      </div>
    </div>
  )
}
