"use client"

import { useEffect, useState } from "react"

import { formatServicesForDisplay } from "@/lib/lead-sheet/service-ids-editor"
import type { NamedService } from "@/lib/performance/services"
import type { Lead } from "@/lib/leads"
import { splitServiceText } from "@/lib/services/match"
import { cn } from "cn"

const inputClass =
  "h-8 w-full min-w-0 rounded-md border-0 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-white focus:ring-1 focus:ring-ring select-text"

type Props = {
  lead: Pick<Lead, "serviceIds" | "service" | "serviceLabels">
  enabledServices: readonly NamedService[]
  label: string
  disabled?: boolean
  onChange: (serviceLabels: string[]) => void
}

export function ServiceTextCell({
  lead,
  enabledServices,
  label,
  disabled,
  onChange,
}: Props) {
  const display = formatServicesForDisplay(lead, enabledServices, "text")
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState(display)

  useEffect(() => {
    if (!focused) setDraft(display)
  }, [display, focused])

  return (
    <input
      type="text"
      aria-label={label}
      disabled={disabled}
      value={focused ? draft : display}
      placeholder="–"
      className={cn(inputClass, disabled && "cursor-not-allowed opacity-60")}
      data-lead-sheet-no-pan="true"
      onFocus={() => {
        setDraft(display)
        setFocused(true)
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        setFocused(false)
        const next = splitServiceText(draft)
        onChange(next)
      }}
    />
  )
}
