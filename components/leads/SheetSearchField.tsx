"use client"

import { SearchIcon, XIcon } from "lucide-react"

import { cn } from "cn"

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  ariaLabel: string
  className?: string
}

/** Compact search box for the lead and customer sheets (clear button, Escape to clear). */
export function SheetSearchField({ value, onChange, placeholder, ariaLabel, className }: Props) {
  return (
    <div className={cn("relative w-full sm:w-64", className)}>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        aria-label={ariaLabel}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="h-9 w-full rounded-full border border-[#d3c3b2] bg-white pr-8 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-[#c4b29d] focus:border-primary focus:ring-2 focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault()
            onChange("")
          }
        }}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear"
          className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => onChange("")}
        >
          <XIcon className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
