"use client"

import { XIcon } from "lucide-react"

import { industryPillClasses } from "@/lib/admin/industry-pill-styles"
import { cn } from "cn"

type Props = {
  stableKey: string
  label: string
  disabled?: boolean
  readOnly?: boolean
  size?: "default" | "summary" | "list" | "compact"
  removeLabel?: string
  onRemove?: () => void
}

export function SubcategoryPill({
  stableKey,
  label,
  disabled,
  readOnly,
  size = "default",
  removeLabel,
  onRemove,
}: Props) {
  const { shell, removeHover } = industryPillClasses(stableKey)

  const sizeClass =
    size === "compact"
      ? "gap-1 px-1.5 py-0 text-[11px] leading-5 shadow-none"
      : size === "list"
        ? "gap-1 px-2.5 py-0.5 text-xs leading-5"
        : size === "summary"
          ? "gap-1 px-2.5 py-0.5 text-sm leading-6"
          : "gap-1.5 px-3 py-1.5 text-sm shadow-sm"

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full font-medium",
        sizeClass,
        shell
      )}
    >
      <span className="truncate">{label}</span>
      {!readOnly && onRemove ? (
        <button
          type="button"
          disabled={disabled}
          aria-label={removeLabel}
          className={cn(
            "ml-0.5 rounded-full p-0.5 transition-colors disabled:opacity-50",
            removeHover
          )}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <XIcon className="size-3.5" />
        </button>
      ) : null}
    </span>
  )
}
