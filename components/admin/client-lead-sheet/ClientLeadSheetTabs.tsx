"use client"

import { cn } from "cn"

type Props<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: { id: T; label: string }[]
}

/** Small pill tabs, same look as the Meta instant forms tabs. */
export function ClientLeadSheetTabs<T extends string>({ value, onChange, options }: Props<T>) {
  return (
    <nav
      role="tablist"
      className="inline-flex w-fit max-w-full gap-1 rounded-xl border border-[#e8e0d8] bg-white p-1 shadow-sm"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            value === option.id
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </nav>
  )
}
