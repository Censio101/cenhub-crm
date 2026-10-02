"use client"

import { useMemo, useState } from "react"
import { EyeIcon, LockIcon } from "lucide-react"

import { adminIconBoxClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { columnVisibility, columnVisibilityKey } from "@/lib/lead-sheet/client-visibility"
import { columnDisplayLabel } from "@/lib/lead-sheet/column-display-label"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { cn } from "cn"

type Props = {
  slug: string
  /** Changes when the client moves to another sheet, so the list is loaded again. */
  sheetKey: string
  onError: (message: string) => void
}

function Switch({
  on,
  disabled,
  label,
  onToggle,
}: {
  on: boolean
  disabled?: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative h-6 w-10 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none disabled:cursor-not-allowed",
        on ? "bg-primary" : "bg-[#d9cfc3]",
        disabled && "opacity-50"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
          on && "translate-x-4"
        )}
      />
    </button>
  )
}

/**
 * Which of the client's fields their dashboard shows. Hiding is display only: leads, webhooks
 * and Meta forms still collect every field of the sheet.
 */
export function ClientDashboardColumns({ slug, sheetKey, onError }: Props) {
  const { t } = useLanguage()
  const [resolved, setResolved] = useState<ResolvedLeadSheetConfig | null>(null)
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useAsyncEffect(
    async (signal) => {
      try {
        const res = await fetch(`/api/admin/organizations/${slug}/dashboard-columns`)
        if (!res.ok) throw new Error("load")
        const data = (await res.json()) as {
          resolved: ResolvedLeadSheetConfig | null
          hiddenKeys: string[]
        }
        if (signal.cancelled) return
        setResolved(data.resolved)
        setHiddenKeys(data.hiddenKeys ?? [])
      } catch {
        if (!signal.cancelled) onError(t("leadSheetsLoadError"))
      }
    },
    [slug, sheetKey, t, onError]
  )

  const rows = useMemo(
    () =>
      (resolved?.columns ?? []).map((column) => ({
        column,
        key: columnVisibilityKey(column),
        label: columnDisplayLabel(column, t),
        state: columnVisibility(column, hiddenKeys),
      })),
    [resolved, hiddenKeys, t]
  )

  async function toggle(key: string) {
    if (saving) return
    const previous = hiddenKeys
    const next = previous.includes(key) ? previous.filter((k) => k !== key) : [...previous, key]
    setHiddenKeys(next)
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/organizations/${slug}/dashboard-columns`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenKeys: next }),
      })
      if (!res.ok) throw new Error("save")
      const data = (await res.json()) as { hiddenKeys: string[] }
      setHiddenKeys(data.hiddenKeys)
    } catch {
      setHiddenKeys(previous)
      onError(t("leadSheetsLoadError"))
    } finally {
      setSaving(false)
    }
  }

  if (!resolved) {
    return (
      <div className={cn(adminSectionCardClass, "space-y-3 p-4 sm:p-5")} aria-busy="true">
        <div className="skeleton-shimmer h-5 w-40 rounded-md" />
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton-shimmer h-9 rounded-lg" />
        ))}
      </div>
    )
  }

  const shown = rows.filter((row) => !row.state.hidden).length

  return (
    <section className={cn(adminSectionCardClass, "overflow-hidden")}>
      <div className="flex items-center gap-3 border-b border-[#efe8e0] px-4 py-3 sm:px-5">
        <span className={adminIconBoxClass("neutral")}>
          <EyeIcon className="size-4" aria-hidden />
        </span>
        <h3 className="flex-1 text-sm font-semibold">{t("clientDashboardColumnsTitle")}</h3>
        <span className="rounded-full border border-[#e8e0d8] bg-[#faf8f6] px-2.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {shown}/{rows.length}
        </span>
      </div>
      <ul className="grid divide-y divide-[#efe8e0] sm:grid-cols-2 sm:divide-y-0">
        {rows.map(({ column, key, label, state }) => (
          <li
            key={column.id}
            className="flex items-center gap-3 px-4 py-2.5 sm:border-b sm:border-[#efe8e0] sm:px-5"
          >
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  state.hidden && "text-muted-foreground"
                )}
                title={label}
              >
                {label}
              </p>
              {state.byTemplate ? (
                <p className="text-xs text-muted-foreground">
                  {t("clientDashboardColumnsHiddenByTemplate")}
                </p>
              ) : null}
            </div>
            {state.locked ? (
              <span
                className="text-muted-foreground"
                title={t("leadFieldsLocked")}
                aria-label={t("leadFieldsLocked")}
              >
                <LockIcon className="size-3.5" aria-hidden />
              </span>
            ) : null}
            <Switch
              on={!state.hidden}
              label={label}
              disabled={state.locked || state.byTemplate || saving}
              onToggle={() => void toggle(key)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
