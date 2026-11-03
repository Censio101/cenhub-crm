"use client"

import type { CSSProperties, ReactNode } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { TableCell } from "@/components/ui/table"
import { leadSegmentLabelKey } from "@/lib/lead-sheet/lead-labels"
import type { Lead } from "@/lib/leads"
import { formatLeadDateTime } from "@/lib/leads/lead-datetime"
import { cn } from "cn"

const readOnlyClass = "min-h-8 py-1.5 text-sm text-foreground"

export function LeadSheetReadOnlyText({
  className,
  children,
  mono,
  title,
  fullText = false,
}: {
  className?: string
  children: ReactNode
  mono?: boolean
  /** Full value on hover when the cell truncates. */
  title?: string
  /** Fuld tekst view: show the whole value when the column is wide enough. */
  fullText?: boolean
}) {
  const hoverTitle =
    !fullText &&
    (title ??
      (typeof children === "string" && children.trim() && children !== "–" ? children : undefined))
  return (
    <span
      title={hoverTitle}
      className={cn(
        readOnlyClass,
        "block px-1.5",
        fullText ? "whitespace-nowrap" : "truncate",
        mono && "font-mono text-[0.8125rem]",
        className
      )}
    >
      {children || "–"}
    </span>
  )
}

export function LeadSheetReadOnlyDateCell({
  lead,
  className,
  style,
  fullText,
}: {
  lead: Lead
  className?: string
  style?: CSSProperties
  fullText?: boolean
}) {
  return (
    <TableCell className={className} style={style}>
      <LeadSheetReadOnlyText fullText={fullText}>
        {formatLeadDateTime(lead.date, lead.time)}
      </LeadSheetReadOnlyText>
    </TableCell>
  )
}

export function LeadSheetReadOnlyWonDateCell({
  lead,
  className,
  fullText,
}: {
  lead: Lead
  className?: string
  fullText?: boolean
}) {
  const value =
    lead.status === "won" && lead.wonDate ? formatLeadDateTime(lead.wonDate, null) : ""
  return (
    <TableCell className={className}>
      <LeadSheetReadOnlyText fullText={fullText}>{value}</LeadSheetReadOnlyText>
    </TableCell>
  )
}

export function LeadSheetReadOnlyFullNameCell({
  lead,
  className,
  style,
  fullText,
}: {
  lead: Lead
  className?: string
  style?: CSSProperties
  fullText?: boolean
}) {
  const name = lead.fullName.trim()
  return (
    <TableCell className={className} style={style}>
      <LeadSheetReadOnlyText title={name || undefined} className="px-1.5" fullText={fullText}>
        {name || "–"}
      </LeadSheetReadOnlyText>
    </TableCell>
  )
}

export function LeadSheetReadOnlyEmailCell({ lead, className }: { lead: Lead; className?: string }) {
  const email = lead.email.trim()
  return (
    <TableCell className={cn("min-w-52 px-2", className)}>
      {email ? (
        <a
          href={`mailto:${email}`}
          title={email}
          className={cn(
            readOnlyClass,
            "block truncate text-foreground no-underline hover:text-primary hover:underline"
          )}
        >
          {email}
        </a>
      ) : (
        <LeadSheetReadOnlyText>–</LeadSheetReadOnlyText>
      )}
    </TableCell>
  )
}

export function LeadSheetReadOnlyPhoneCell({ lead, className }: { lead: Lead; className?: string }) {
  const phone = lead.phone.trim()
  return (
    <TableCell className={cn("min-w-36 px-2", className)}>
      {phone ? (
        <a
          href={`tel:${phone.replace(/[^\d+]/g, "")}`}
          title={phone}
          className={cn(
            readOnlyClass,
            "block truncate text-foreground no-underline hover:text-primary hover:underline"
          )}
        >
          {phone}
        </a>
      ) : (
        <LeadSheetReadOnlyText>–</LeadSheetReadOnlyText>
      )}
    </TableCell>
  )
}

export function LeadSheetReadOnlySegmentCell({ lead, className }: { lead: Lead; className?: string }) {
  const { t } = useLanguage()
  const label = lead.segment ? t(leadSegmentLabelKey(lead.segment)) : "–"
  return (
    <TableCell className={cn("px-2", className)}>
      <LeadSheetReadOnlyText>{label}</LeadSheetReadOnlyText>
    </TableCell>
  )
}

export function LeadSheetReadOnlyPlainCell({
  value,
  className,
  mono,
  fullText,
}: {
  value: string
  className?: string
  mono?: boolean
  fullText?: boolean
}) {
  return (
    <TableCell className={className}>
      <LeadSheetReadOnlyText mono={mono} fullText={fullText}>
        {value.trim() || "–"}
      </LeadSheetReadOnlyText>
    </TableCell>
  )
}

/**
 * Form steps of a stepped funnel form: "5 / 8" with a small bar while the lead is partial, a green
 * "8 / 8" once every step is done. Leads from other sources have no step count.
 */
export function LeadSheetFormProgressCell({
  lead,
  total,
  className,
}: {
  lead: Lead
  total: number | null | undefined
  className?: string
}) {
  const { t } = useLanguage()
  const done = lead.formStepsDone
  if (done == null || !total) {
    return (
      <TableCell className={className}>
        <LeadSheetReadOnlyText>{""}</LeadSheetReadOnlyText>
      </TableCell>
    )
  }
  const complete = done >= total
  const shown = Math.min(done, total)
  return (
    <TableCell className={className}>
      <span
        className="flex min-h-8 items-center gap-2 px-1.5 py-1.5"
        title={`${shown} / ${total}`}
      >
        {complete ? (
          <span
            className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-800"
            title={t("formProgressComplete")}
          >
            {shown} / {total}
          </span>
        ) : (
          <>
            <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-[#eadfd3]">
              <span
                className="block h-full rounded-full bg-amber-500"
                style={{ width: `${Math.round((shown / total) * 100)}%` }}
              />
            </span>
            <span className="text-xs font-semibold tabular-nums text-amber-800">
              {shown} / {total}
            </span>
          </>
        )}
      </span>
    </TableCell>
  )
}
