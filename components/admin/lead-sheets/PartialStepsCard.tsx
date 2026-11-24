"use client"

import { ListChecksIcon } from "lucide-react"
import { useState } from "react"

import { adminFieldClass, adminIconBoxClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { FORM_STEPS_MAX, FORM_STEPS_MIN, isValidFormStepsTotal } from "@/lib/lead-sheet/form-steps"
import { cn } from "cn"

export type PartialStepsValue = {
  partial: boolean
  column: boolean
  total: number | null
}

function Switch({
  checked,
  label,
  disabled,
  onToggle,
}: {
  checked: boolean
  label: string
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-emerald-600" : "bg-[#d3c3b2]"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

/**
 * Two separate switches on a lead sheet template.
 * - Partial steps: the form may post a lead before it is finished; later calls with the same
 *   lead id fill the same row.
 * - Steps column: whether the Form steps column is shown on the sheet. Its total is optional and
 *   only matters together with partial steps.
 * A saved total keeps both on.
 */
export function PartialStepsCard({
  partialOn,
  columnOn,
  total,
  disabled,
  onSave,
}: {
  partialOn: boolean
  columnOn: boolean
  /** Saved shared total; null = each form sends its own status. */
  total: number | null
  disabled?: boolean
  /** Returns an error message, or null when saved. */
  onSave: (next: PartialStepsValue) => Promise<string | null>
}) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState(total == null ? "" : String(total))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = draft.trim()
  const parsed = Number(trimmed)
  const draftValid = trimmed !== "" && isValidFormStepsTotal(parsed)
  const draftEmpty = trimmed === ""
  const showTotal = partialOn && columnOn
  const dirty = showTotal && ((draftEmpty && total !== null) || (draftValid && parsed !== total))

  async function save(next: PartialStepsValue) {
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
      <div className="flex items-center gap-3">
        <span className={adminIconBoxClass("violet")} aria-hidden="true">
          <ListChecksIcon className="size-[18px]" />
        </span>
        <h2 className="text-[14px] font-semibold leading-tight text-foreground">
          {t("partialStepsTitle")}
        </h2>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 border-t border-[#e8e0d8] pt-3">
        <p className="text-[13px] font-medium text-foreground">{t("partialStepsEnable")}</p>
        <Switch
          checked={partialOn}
          label={t("partialStepsEnable")}
          disabled={disabled || busy}
          // Turning partial steps off also clears the total, which only applies to partial leads.
          onToggle={() => void save({ partial: !partialOn, column: columnOn, total: partialOn ? null : total })}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 border-t border-[#e8e0d8] pt-3">
        <p className="text-[13px] font-medium text-foreground">{t("partialStepsShowColumn")}</p>
        <Switch
          checked={columnOn}
          label={t("partialStepsShowColumn")}
          disabled={disabled || busy}
          onToggle={() => void save({ partial: partialOn, column: !columnOn, total: null })}
        />
      </div>

      {showTotal ? (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-[#e8e0d8] pt-3">
          <label className="grid gap-1">
            <span className="flex items-baseline gap-2 text-[12px] font-semibold text-muted-foreground">
              {t("partialStepsTotalLabel")}
              <span className="font-medium">{t("partialStepsTotalOptional")}</span>
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
                  void save({ partial: true, column: true, total: draftEmpty ? null : parsed })
                }
              }}
              className={cn(adminFieldClass, "w-28")}
            />
          </label>
          {dirty ? (
            <Button
              type="button"
              className="h-11"
              disabled={busy || (!draftEmpty && !draftValid)}
              onClick={() => void save({ partial: true, column: true, total: draftEmpty ? null : parsed })}
            >
              {t("partialStepsSave")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {showTotal && trimmed !== "" && !draftValid ? (
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
