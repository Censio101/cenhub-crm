"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CheckIcon, Loader2Icon, PlusIcon, SearchIcon, TableIcon, UserIcon } from "lucide-react"

import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import {
  LeadSheetColumnStrip,
  LeadSheetColumnStripSkeleton,
} from "@/components/admin/client-lead-sheet/LeadSheetColumnStrip"
import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { useAdminClientLeadSheet } from "@/hooks/useAdminClientLeadSheet"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { useKeyedState } from "@/lib/react/use-keyed-state"
import { cn } from "cn"

const BLANK = "__blank__"
const OWN = "__own__"

type Props = {
  leadSheet: ReturnType<typeof useAdminClientLeadSheet>
  onClose: () => void
}

function OptionCard({
  icon: Icon,
  name,
  tag,
  meta,
  selected,
  current,
  dashed,
  onSelect,
  disabled,
}: {
  icon: typeof TableIcon
  name: string
  tag?: string
  /** Small muted text on the right, e.g. the column count. */
  meta?: string
  selected: boolean
  current: boolean
  dashed?: boolean
  onSelect: () => void
  disabled: boolean
}) {
  const { t } = useLanguage()
  const ref = useRef<HTMLButtonElement>(null)
  // A long list opens scrolled to the choice that is already selected.
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest" })
  }, [selected])
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
        "focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none disabled:opacity-60",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : dashed
            ? "border-dashed border-[#d3c3b2] hover:border-primary/50 hover:bg-white"
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
        <span className="block truncate text-sm font-semibold" title={name}>
          {name}
        </span>
        {tag ? <span className="block text-xs text-muted-foreground">{tag}</span> : null}
      </span>
      {meta ? (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{meta}</span>
      ) : null}
      {current ? (
        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
          {t("clientLeadSheetActiveBadge")}
        </span>
      ) : null}
      {selected ? <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden /> : null}
    </button>
  )
}

/**
 * One popup for switching what the client uses: pick a shared template or the client's own
 * sheet, see its columns, confirm. Creating the own sheet happens here too.
 */
export function ChangeSheetDialog({ leadSheet, onClose }: Props) {
  const { t } = useLanguage()
  const {
    sharedTemplates,
    clientTemplates,
    templateId,
    savedIsClientOwned,
    busy,
    error,
    patchTemplateId,
    createClientTemplate,
  } = leadSheet

  const shared = useMemo(
    () =>
      [...sharedTemplates].sort((a, b) => {
        if (a.isSystemDefault !== b.isSystemDefault) return a.isSystemDefault ? -1 : 1
        return a.name.localeCompare(b.name)
      }),
    [sharedTemplates]
  )
  const [search, setSearch] = useState("")
  const showSearch = shared.length > 6
  const visibleShared = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? shared.filter((tpl) => tpl.name.toLowerCase().includes(q)) : shared
  }, [shared, search])
  const own = clientTemplates[0] ?? null
  const defaultShared = shared.find((tpl) => tpl.isSystemDefault) ?? shared[0] ?? null

  // What is picked: a shared template id, or OWN for the client's own sheet.
  const [selected, setSelected] = useState(savedIsClientOwned ? OWN : templateId)
  const [copySource, setCopySource] = useState(defaultShared?.id ?? BLANK)

  const creatingOwn = selected === OWN && !own
  const previewId = selected === OWN ? (own?.id ?? null) : selected
  const isCurrent = selected === OWN ? savedIsClientOwned && Boolean(own) : templateId === selected

  const [config, setConfig] = useKeyedState<ResolvedLeadSheetConfig | null>(null, previewId)
  const [failedId, setFailedId] = useState<string | null>(null)

  useAsyncEffect(
    async (signal) => {
      if (!previewId) return
      try {
        const res = await fetch(`/api/admin/lead-sheet-templates/${previewId}`)
        if (!res.ok) throw new Error("load")
        const data = (await res.json()) as ResolvedLeadSheetConfig
        if (!signal.cancelled) setConfig(data)
      } catch {
        if (!signal.cancelled) setFailedId(previewId)
      }
    },
    [previewId]
  )

  async function confirm() {
    if (busy) return
    let ok: boolean
    if (creatingOwn) {
      const id = await createClientTemplate(
        copySource === BLANK ? { blank: true } : { sourceId: copySource }
      )
      ok = Boolean(id)
    } else if (previewId) {
      ok = await patchTemplateId(previewId)
    } else {
      return
    }
    if (ok) onClose()
  }

  const copyLabel =
    copySource === BLANK
      ? t("leadSheetClientCreateBlank")
      : (shared.find((tpl) => tpl.id === copySource)?.name ?? null)

  return (
    <ModalShell
      size="md"
      title={t("clientLeadSheetChange")}
      busy={busy}
      dismissible={!busy}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            {t("leadSheetCancel")}
          </Button>
          <Button type="button" disabled={busy || isCurrent} onClick={() => void confirm()}>
            {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {creatingOwn
              ? t("clientLeadSheetCreateCustomPrimary")
              : t("clientLeadSheetUseThisSheet")}
          </Button>
        </>
      }
    >
      <div role="radiogroup" className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("leadSheetClientTemplateGroupClient")}
          </h3>
          {own ? (
            <OptionCard
              icon={UserIcon}
              name={own.name}
              meta={
                own.columnCount !== undefined
                  ? t("leadSheetsColumnCount").replace("{count}", String(own.columnCount))
                  : undefined
              }
              selected={selected === OWN}
              current={savedIsClientOwned}
              disabled={busy}
              onSelect={() => setSelected(OWN)}
            />
          ) : (
            <OptionCard
              icon={PlusIcon}
              name={t("clientLeadSheetCreateSectionTitle")}
              selected={selected === OWN}
              current={false}
              dashed
              disabled={busy}
              onSelect={() => setSelected(OWN)}
            />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("leadSheetClientTemplateGroupShared")}
            </h3>
            <span className="rounded-full bg-[#f3ebe3] px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
              {shared.length}
            </span>
          </div>
          {showSearch ? (
            <label className="relative block">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                className={cn(adminFieldClass, "h-9 pl-9")}
                placeholder={t("leadSheetsTemplatesSearchPlaceholder")}
                value={search}
                disabled={busy}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          ) : null}
          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {visibleShared.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("leadSheetsTemplatesSearchEmpty")}
              </p>
            ) : (
              visibleShared.map((tpl) => (
                <OptionCard
                  key={tpl.id}
                  icon={TableIcon}
                  name={tpl.name}
                  tag={tpl.isSystemDefault ? t("leadSheetsBadgeDefault") : undefined}
                  meta={
                    tpl.columnCount !== undefined
                      ? t("leadSheetsColumnCount").replace("{count}", String(tpl.columnCount))
                      : undefined
                  }
                  selected={selected === tpl.id}
                  current={!savedIsClientOwned && templateId === tpl.id}
                  disabled={busy}
                  onSelect={() => setSelected(tpl.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {creatingOwn ? (
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">{t("clientLeadSheetCreateCustomSource")}</span>
          <Select
            value={copySource}
            onValueChange={(v) => typeof v === "string" && setCopySource(v)}
            disabled={busy}
          >
            <SelectTrigger className={cn(adminFieldClass, "w-full min-w-0")}>
              <SelectValue>{copyLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger className="min-w-[var(--anchor-width)]">
              {shared.map((tpl) => (
                <SelectItem key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </SelectItem>
              ))}
              <SelectItem value={BLANK}>{t("leadSheetClientCreateBlank")}</SelectItem>
            </SelectContent>
          </Select>
        </label>
      ) : config ? (
        <LeadSheetColumnStrip columns={config.columns} />
      ) : failedId === previewId && previewId ? (
        <p className="text-sm text-red-700">{t("leadSheetsLoadError")}</p>
      ) : previewId ? (
        <LeadSheetColumnStripSkeleton />
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
    </ModalShell>
  )
}
