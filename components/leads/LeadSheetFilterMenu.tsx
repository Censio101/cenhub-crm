"use client"

import type { ReactNode } from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "cn"

/** One height / radius for every control on the sheet bar (filters, search, buttons). */
export const SHEET_CONTROL_CLASS =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-[4px] border px-3 text-[13px] font-medium whitespace-nowrap shadow-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-50"

export const SHEET_CONTROL_IDLE =
  "border-[#d9cfc3] bg-white text-foreground hover:border-[#c4b29d] hover:bg-[#fffaf5]"

export const SHEET_CONTROL_ACTIVE =
  "border-primary/40 bg-[#fff1e6] text-[#b54708] hover:border-primary/60 hover:bg-[#ffe9d6]"

/**
 * Shared dropdown for every filter on the lead sheet.
 * Idle: shows only the label. Active: shows "Label: value" with an orange tint.
 */
export function LeadSheetFilterMenu({
  icon,
  label,
  valueLabel,
  active = false,
  disabled,
  ariaLabel,
  menuClassName,
  children,
}: {
  icon: ReactNode
  label: string
  /** Shown after the label when the filter is active. */
  valueLabel?: string
  active?: boolean
  disabled?: boolean
  ariaLabel?: string
  menuClassName?: string
  children: ReactNode
}) {
  return (
    // Non-modal: a modal menu locks page scroll, which removes the scrollbar and shifts the layout.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        title={active && valueLabel ? valueLabel : label}
        className={cn(
          SHEET_CONTROL_CLASS,
          "group w-44 justify-between",
          active ? SHEET_CONTROL_ACTIVE : SHEET_CONTROL_IDLE
        )}
      >
        <span
          className={cn("flex shrink-0 [&_svg]:size-4", active ? "text-primary" : "text-muted-foreground")}
          aria-hidden
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-left">
          {active && valueLabel ? valueLabel : label}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 transition-transform duration-150 ease-out group-data-[popup-open]:rotate-180 motion-reduce:transition-none",
            active ? "text-primary" : "text-muted-foreground"
          )}
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className={cn(
          "sheet-filter-menu w-auto min-w-56 max-h-[min(24rem,var(--available-height))] rounded-[4px] p-1.5",
          menuClassName
        )}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Menu row: reserved check column, optional status dot, label, trailing count. */
export function LeadSheetFilterMenuItem({
  selected,
  onSelect,
  count,
  dotClassName,
  indent,
  muted,
  children,
}: {
  selected: boolean
  onSelect: () => void
  count?: number
  dotClassName?: string
  indent?: boolean
  /** Empty options stay available, but read as inactive. */
  muted?: boolean
  children: ReactNode
}) {
  return (
    <DropdownMenuItem
      onClick={onSelect}
      className={cn(
        "min-h-8 gap-2 rounded-[4px] px-2 py-1.5 text-[13px]",
        muted && "text-muted-foreground opacity-45",
        selected && "bg-[#fff1e6] font-medium text-[#b54708] opacity-100",
        indent && "pl-6"
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {selected ? <CheckIcon className="size-4 text-primary" aria-hidden /> : null}
      </span>
      {dotClassName ? <span className={cn("size-2 shrink-0 rounded-full", dotClassName)} aria-hidden /> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count !== undefined ? (
        <span className="ml-3 text-xs tabular-nums text-muted-foreground">{count}</span>
      ) : null}
    </DropdownMenuItem>
  )
}

export function LeadSheetFilterMenuHeading({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase first:pt-1">
      {children}
    </div>
  )
}
