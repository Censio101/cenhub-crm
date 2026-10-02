"use client"

import { useState } from "react"
import { PlusIcon, XIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

type Props = {
  options: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  invalid?: boolean
}

const OPTION_MAX_LENGTH = 80

/** Adds `raw` (may contain several values separated by commas or new lines), skipping duplicates. */
function mergeOptions(existing: string[], raw: string): string[] {
  const seen = new Set(existing.map((o) => o.toLocaleLowerCase()))
  const next = [...existing]
  for (const part of raw.split(/[\n,]/)) {
    const value = part.trim().slice(0, OPTION_MAX_LENGTH)
    const key = value.toLocaleLowerCase()
    if (!value || seen.has(key)) continue
    seen.add(key)
    next.push(value)
  }
  return next
}

/** Chip input for dropdown options: Enter or comma adds, × removes, pasted lists are split. */
export function SelectOptionsInput({ options, onChange, disabled, invalid }: Props) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState("")

  function commit() {
    if (!draft.trim()) return
    onChange(mergeOptions(options, draft))
    setDraft("")
  }

  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <input
          className={cn(
            "h-10 min-w-0 flex-1 rounded-xl border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2",
            invalid
              ? "border-red-400 focus:border-red-500 focus:ring-red-200"
              : "border-[#d3c3b2] focus:border-primary focus:ring-primary/15"
          )}
          value={draft}
          disabled={disabled}
          maxLength={OPTION_MAX_LENGTH * 20}
          placeholder={t("leadSheetsOptionsPlaceholder")}
          aria-label={t("leadSheetsOptionsHeading")}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text")
            if (/[\n,]/.test(text)) {
              e.preventDefault()
              onChange(mergeOptions(options, draft + text))
              setDraft("")
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault()
              // Keep Enter from reaching any parent form / dialog handlers.
              e.stopPropagation()
              commit()
            } else if (e.key === "Backspace" && !draft && options.length > 0) {
              onChange(options.slice(0, -1))
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={disabled || !draft.trim()}
          onClick={commit}
        >
          <PlusIcon className="size-4" />
          {t("leadSheetsOptionsAdd")}
        </Button>
      </div>

      {options.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {options.map((option) => (
            <li
              key={option}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#e2d5c6] bg-[#faf5ef] py-0.5 pl-2.5 pr-1 text-xs font-medium text-foreground"
            >
              <span className="truncate">{option}</span>
              <button
                type="button"
                disabled={disabled}
                aria-label={t("leadSheetsOptionsRemove").replace("{name}", option)}
                className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-[#eadfd2] hover:text-foreground disabled:opacity-50"
                onClick={() => onChange(options.filter((o) => o !== option))}
              >
                <XIcon className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className={cn("text-xs", invalid ? "text-red-700" : "text-muted-foreground")}>
        {t("leadSheetsOptionsHint")}
      </p>
    </div>
  )
}
