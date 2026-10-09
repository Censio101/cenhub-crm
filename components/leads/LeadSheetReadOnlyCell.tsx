"use client"

import type { ReactNode } from "react"

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
}: {
  className?: string
  children: ReactNode
  mono?: boolean
}) {
  return (
    <span className={cn(readOnlyClass, "block truncate px-1.5", mono && "font-mono text-[0.8125rem]", className)}>
      {children || "–"}
    </span>
  )
}

export function LeadSheetReadOnlyDateCell({
  lead,
  className,
}: {
  lead: Lead
  className?: string
}) {
  return (
    <TableCell className={className}>
      <LeadSheetReadOnlyText>{formatLeadDateTime(lead.date, lead.time)}</LeadSheetReadOnlyText>
    </TableCell>
  )
}

export function LeadSheetReadOnlyFullNameCell({
  lead,
  className,
}: {
  lead: Lead
  className?: string
}) {
  return (
    <TableCell className={className}>
      <div className="flex min-w-0 items-center gap-1.5 px-1">
        <span className={cn(readOnlyClass, "min-w-0 flex-1 truncate px-0")}>
          {lead.fullName.trim() || "–"}
        </span>
        {lead.source === "meta" ? (
          <span className="shrink-0 rounded-full bg-[#1877F2]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1877F2]">
            Meta
          </span>
        ) : null}
      </div>
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
          className={cn(
            readOnlyClass,
            "text-foreground no-underline hover:text-primary hover:underline"
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
          className={cn(
            readOnlyClass,
            "text-foreground no-underline hover:text-primary hover:underline"
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
