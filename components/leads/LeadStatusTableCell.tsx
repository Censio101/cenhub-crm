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
}: {
  status: LeadStatusId
  options: ReadonlyArray<StatusOption>
  label: string
  onStatusChange: (status: LeadStatusId) => void
}) {
  return (
    <TableCell
      data-lead-status-cell=""
      className={cn(
        "min-w-[13.5rem] p-0 transition-[background-color,color] duration-200 ease-out",
        getLeadStatusCellClass(status)
      )}
    >
      <div className="flex h-12 items-stretch">
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
