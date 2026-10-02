"use client"

import { PlusIcon, XIcon } from "lucide-react"

import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

const NAME_MAX_LENGTH = 80

/** Adds `raw` (one or several names split on commas / new lines), skipping duplicates. */
export function mergeNames(existing: string[], raw: string): string[] {
  const seen = new Set(existing.map((name) => name.toLocaleLowerCase()))
  const next = [...existing]
  for (const part of raw.split(/[\n,]/)) {
    const value = part.trim().slice(0, NAME_MAX_LENGTH)
    const key = value.toLocaleLowerCase()
    if (!value || seen.has(key)) continue
    seen.add(key)
    next.push(value)
  }
  return next
}

type Props = {
  names: string[]
  onChange: (next: string[]) => void
  /** Text typed but not yet turned into a chip — owned by the parent so submit can include it. */
  draft: string
  onDraftChange: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
}

/** Type a name and press Enter (or comma) to add it as a chip; pasted lists are split. */
export function NamesChipInput({
  names,
  onChange,
  draft,
  onDraftChange,
  disabled,
  autoFocus,
}: Props) {
  const { t } = useLanguage()

  function commit() {
    if (!draft.trim()) return
    onChange(mergeNames(names, draft))
    onDraftChange("")
  }

  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <input
          autoFocus={autoFocus}
          className={cn(adminFieldClass, "h-10 text-sm")}
          value={draft}
          disabled={disabled}
          maxLength={NAME_MAX_LENGTH * 20}
          placeholder={t("businessCategoriesSubsInputPlaceholder")}
          aria-label={t("businessCategoriesSubsOptionalLabel")}
          onChange={(e) => onDraftChange(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text")
            if (/[\n,]/.test(text)) {
              e.preventDefault()
              onChange(mergeNames(names, draft + text))
              onDraftChange("")
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault()
              e.stopPropagation()
              commit()
            } else if (e.key === "Backspace" && !draft && names.length > 0) {
              onChange(names.slice(0, -1))
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0"
          disabled={disabled || !draft.trim()}
          onClick={commit}
        >
          <PlusIcon className="size-4" />
          {t("businessCategoriesAddAction")}
        </Button>
      </div>

      {names.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {names.map((name) => (
            <li
              key={name}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#e2d5c6] bg-[#faf5ef] py-0.5 pl-2.5 pr-1 text-xs font-medium text-foreground"
            >
              <span className="truncate">{name}</span>
              <button
                type="button"
                disabled={disabled}
                aria-label={`${t("businessCategoriesRemoveSubcategory")} — ${name}`}
                className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-[#eadfd2] hover:text-foreground disabled:opacity-50"
                onClick={() => onChange(names.filter((n) => n !== name))}
              >
                <XIcon className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-muted-foreground">{t("businessCategoriesSubsInputHint")}</p>
    </div>
  )
}
