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
}: {
  className?: string
  children: ReactNode
  mono?: boolean
  /** Full value on hover when the cell truncates. */
  title?: string
}) {
  const hoverTitle =
    title ??
    (typeof children === "string" && children.trim() && children !== "–" ? children : undefined)
  return (
    <span
      title={hoverTitle}
      className={cn(readOnlyClass, "block truncate px-1.5", mono && "font-mono text-[0.8125rem]", className)}
    >
      {children || "–"}
    </span>
  )
}

export function LeadSheetReadOnlyDateCell({
  lead,
  className,
  style,
}: {
  lead: Lead
  className?: string
  style?: CSSProperties
}) {
  return (
    <TableCell className={className} style={style}>
      <LeadSheetReadOnlyText>{formatLeadDateTime(lead.date, lead.time)}</LeadSheetReadOnlyText>
    </TableCell>
  )
}

export function LeadSheetReadOnlyWonDateCell({
  lead,
  className,
}: {
  lead: Lead
  className?: string
}) {
  const value =
    lead.status === "won" && lead.wonDate ? formatLeadDateTime(lead.wonDate, null) : ""
  return (
    <TableCell className={className}>
      <LeadSheetReadOnlyText>{value}</LeadSheetReadOnlyText>
    </TableCell>
  )
}

export function LeadSheetReadOnlyFullNameCell({
  lead,
  className,
  style,
}: {
  lead: Lead
  className?: string
  style?: CSSProperties
}) {
  const name = lead.fullName.trim()
  return (
    <TableCell className={className} style={style}>
      <LeadSheetReadOnlyText title={name || undefined} className="px-1.5">
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
}: {
  value: string
  className?: string
  mono?: boolean
}) {
  return (
    <TableCell className={className}>
      <LeadSheetReadOnlyText mono={mono}>{value.trim() || "–"}</LeadSheetReadOnlyText>
    </TableCell>
  )
}
