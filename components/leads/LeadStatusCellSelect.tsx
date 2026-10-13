"use client"

import { useMemo, useState } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getLeadStatusClass, isLeadStatusId, type LeadStatusId } from "@/lib/leads"
import { STATUS_FILTER_GROUPS } from "@/lib/leads/status-filter-groups"
import { cn } from "cn"
import { CheckIcon } from "lucide-react"

const STATUS_MENU_ITEM =
  "flex w-full items-center gap-2 rounded-none border-0 border-b border-black/[0.08] py-2.5 pl-3 pr-3 text-left text-[0.9375rem] font-semibold shadow-none last:border-b-0 outline-none touch-manipulation"

const STATUS_MENU_CONTENT =
  "lead-status-select-menu z-[80] w-[min(16.5rem,calc(100vw-2rem))] max-h-[min(26rem,var(--available-height))] rounded-none border border-[#d9cfc3] bg-white p-0 shadow-[0_10px_28px_rgba(26,18,8,0.14)] data-open:animate-none data-closed:animate-none"

const STATUS_TRIGGER =
  "flex h-full min-h-0 w-full items-center rounded-none border-0 bg-transparent px-3 text-left text-[0.9375rem] font-semibold text-current shadow-none outline-none hover:bg-black/[0.04] focus-visible:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation"

type Option = { id: LeadStatusId; label: string }

export function LeadStatusCellSelect({
  status,
  options,
  label,
  onChange,
  disabled,
}: {
  status: LeadStatusId
  options: ReadonlyArray<Option>
  label: string
  onChange: (status: LeadStatusId) => void
  disabled?: boolean
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const optionById = useMemo(() => new Map(options.map((o) => [o.id, o])), [options])
  const displayLabel = optionById.get(status)?.label ?? label

  function pick(statusId: LeadStatusId) {
    if (!isLeadStatusId(statusId) || statusId === status) {
      setOpen(false)
      return
    }
    onChange(statusId)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        aria-label={label}
        className={STATUS_TRIGGER}
        onClick={(event) => event.stopPropagation()}
      >
        <span
          key={status}
          className="lead-status-cell-label min-w-0 flex-1 whitespace-normal leading-snug"
        >
          {displayLabel}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={0}
        alignOffset={0}
        className={STATUS_MENU_CONTENT}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="max-h-[min(26rem,var(--available-height))] overflow-y-auto overscroll-contain"
          role="listbox"
          aria-label={label}
        >
          {STATUS_FILTER_GROUPS.map((group) => (
            <div key={group.id} className="p-0">
              <div className="pointer-events-none sticky top-0 z-[1] border-b border-[#ebe4dc] bg-[#f7f4ef] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#6f655c] uppercase">
                {t(group.labelKey)}
              </div>
              {group.statuses.map((statusId) => {
                const option = optionById.get(statusId)
                if (!option) return null
                const selected = statusId === status
                return (
                  <button
                    key={statusId}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      STATUS_MENU_ITEM,
                      getLeadStatusClass(statusId),
                      selected && "ring-2 ring-inset ring-black/15"
                    )}
                    onPointerDown={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      pick(statusId)
                    }}
                  >
                    <span className="min-w-0 flex-1">{option.label}</span>
                    {selected ? <CheckIcon className="size-4 shrink-0 opacity-80" aria-hidden /> : null}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
