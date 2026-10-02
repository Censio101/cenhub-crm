"use client"

import { useState } from "react"

import { formatLeadDateTime, parseLeadDateTime } from "@/lib/leads/lead-datetime"

type Props = {
  date: string
  time?: string | null
  disabled?: boolean
  className?: string
  ariaLabel: string
  /** Called with the parsed day and time once the text is readable. */
  onCommit: (value: { date: string; time: string | null }) => void
}

/**
 * The Date cell: editable text, day first then time (`2026-03-24 14:30`). Nothing is saved
 * while typing; on Enter or blur it is saved if readable, otherwise the old value comes back.
 */
export function LeadDateTimeCell({ date, time, disabled, className, ariaLabel, onCommit }: Props) {
  const stored = formatLeadDateTime(date, time)
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    if (draft === null) return
    const parsed = parseLeadDateTime(draft)
    setDraft(null)
    if (!parsed) return
    if (parsed.date === date && parsed.time === (time ?? null)) return
    onCommit(parsed)
  }

  return (
    <input
      value={draft ?? stored}
      aria-label={ariaLabel}
      disabled={disabled}
      className={className}
      spellCheck={false}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          event.currentTarget.blur()
        } else if (event.key === "Escape") {
          setDraft(null)
          event.currentTarget.blur()
        }
      }}
    />
  )
}
