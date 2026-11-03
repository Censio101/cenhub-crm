"use client"

import { LeadStatusCellSelect } from "@/components/leads/LeadStatusCellSelect"
import { TableCell } from "@/components/ui/table"
import { getLeadStatusCellClass, type LeadStatusId } from "@/lib/leads"
import { cn } from "cn"

type StatusOption = { id: LeadStatusId; label: string }

export function LeadStatusTableCell({
  status,
  options,
  label,
  onStatusChange,
  compact = false,
}: {
  status: LeadStatusId
  options: ReadonlyArray<StatusOption>
  label: string
  onStatusChange: (status: LeadStatusId) => void
  /** Tight rows: the cell is as tall as the other controls. */
  compact?: boolean
}) {
  return (
    <TableCell
      data-lead-status-cell=""
      data-lead-sheet-no-pan="true"
      className={cn(
        "min-w-0 max-w-full p-0 transition-[background-color,color] duration-200 ease-out",
        getLeadStatusCellClass(status)
      )}
    >
      <div className={cn("flex items-stretch", compact ? "h-9" : "h-12")}>
        <LeadStatusCellSelect
          status={status}
          label={label}
          options={options}
          onChange={onStatusChange}
        />
      </div>
    </TableCell>
  )
}
