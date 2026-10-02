"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "cn"

type Option<T extends string> = {
  id: T
  label: string
  /** A small step number shown before the label. */
  step?: number
  /** A small status dot after the label. */
  dot?: "ok" | "wait" | null
  /** Optional icon before the label. */
  icon?: LucideIcon
}

type Props<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  className?: string
}

/** Pill tabs (same look as the Meta instant forms tabs), with optional step numbers and dots. */
export function AdminPillTabs<T extends string>({ value, onChange, options, className }: Props<T>) {
  return (
    <nav
      role="tablist"
      className={cn(
        "inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-[#e8e0d8] bg-white p-1 shadow-sm",
        className
      )}
    >
      {options.map((option) => {
        const selected = value === option.id
        const Icon = option.icon
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              selected
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon ? (
              <Icon className="size-4 shrink-0" aria-hidden />
            ) : option.step !== undefined ? (
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px] font-semibold",
                  selected ? "bg-white/25 text-white" : "bg-[#f3ebe3] text-muted-foreground"
                )}
                aria-hidden
              >
                {option.step}
              </span>
            ) : null}
            {option.label}
            {option.dot ? (
              <span
                className={cn(
                  "size-2 rounded-full",
                  option.dot === "ok" ? "bg-emerald-500" : "bg-amber-500",
                  selected && "ring-2 ring-white/60"
                )}
                aria-hidden
              />
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}
