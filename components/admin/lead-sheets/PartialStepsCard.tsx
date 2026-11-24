"use client"

import { ListChecksIcon } from "lucide-react"
import { useState } from "react"

import { adminFieldClass, adminIconBoxClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { FORM_STEPS_MAX, FORM_STEPS_MIN, isValidFormStepsTotal } from "@/lib/lead-sheet/form-steps"
import { cn } from "cn"

/**
 * Form steps on a lead sheet. The column is optional. A total is optional too, and only
 * appears after the column is turned on. A saved total keeps the column on.
 */
export function PartialStepsCard({
  columnOn,
  total,
  disabled,
  onSave,
}: {
  /** Saved column visibility. A saved total also counts as on. */
  columnOn: boolean
  /** Saved shared total; null = each form sends its own step. */
  total: number | null
  disabled?: boolean
  /** Returns an error message, or null when saved. */
  onSave: (next: { column: boolean; total: number | null }) => Promise<string | null>
}) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState(total == null ? "" : String(total))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enabled = columnOn || total !== null

  const trimmed = draft.trim()
  const parsed = Number(trimmed)
  const draftValid = trimmed !== "" && isValidFormStepsTotal(parsed)
  const draftEmpty = trimmed === ""
  const dirty =
    enabled && ((draftEmpty && total !== null) || (draftValid && parsed !== total))

  async function save(next: { column: boolean; total: number | null }) {
    setBusy(true)
    setError(null)
    const message = await onSave(next)
    if (message) setError(message)
    setBusy(false)
  }

  return (
    <section
      className={cn(adminSectionCardClass, "px-4 py-3.5 sm:px-5")}
      aria-label={t("partialStepsTitle")}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className={adminIconBoxClass("violet")} aria-hidden="true">
            <ListChecksIcon className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold leading-tight text-foreground">
              {t("partialStepsTitle")}
            </h2>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={t("partialStepsShowColumn")}
          disabled={disabled || busy}
          onClick={() => {
            if (enabled) void save({ column: false, total: null })
            else void save({ column: true, total: null })
          }}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            enabled ? "bg-emerald-600" : "bg-[#d3c3b2]"
          )}
        >
          <span
            className={cn(
              "pointer-events-none absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
              enabled ? "translate-x-[22px]" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      {enabled ? (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-[#e8e0d8] pt-3">
          <label className="grid gap-1">
            <span className="text-[12px] font-semibold text-muted-foreground">
              {t("partialStepsTotalLabel")}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={FORM_STEPS_MIN}
              max={FORM_STEPS_MAX}
              value={draft}
              disabled={disabled || busy}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && dirty) {
                  void save({ column: true, total: draftEmpty ? null : parsed })
                }
              }}
              className={cn(adminFieldClass, "w-28")}
            />
          </label>
          {dirty ? (
            <Button
              type="button"
              className="h-11"
              disabled={busy}
              onClick={() => void save({ column: true, total: draftEmpty ? null : parsed })}
            >
              {t("partialStepsSave")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {enabled && trimmed !== "" && !draftValid ? (
        <p className="mt-2 text-[12px] text-red-700">
          {t("partialStepsInvalid", { min: FORM_STEPS_MIN, max: FORM_STEPS_MAX })}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-[12px] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
