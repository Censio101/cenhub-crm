"use client"

import { CheckIcon, Loader2Icon } from "lucide-react"

import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import type { PickerOrganization } from "@/lib/admin/client-picker"
import { cn } from "cn"

type ClientSwitcherOptionRowProps = {
  option: PickerOrganization
  isActive: boolean
  isSwitching: boolean
  disabled: boolean
  onSelect: () => void
}

export function ClientSwitcherOptionRow({
  option,
  isActive,
  isSwitching,
  disabled,
  onSelect,
}: ClientSwitcherOptionRowProps) {
  const optionName = formatClientDisplayName(option.name)

  return (
    <li role="presentation">
      <button
        type="button"
        role="option"
        aria-selected={isActive}
        aria-busy={isSwitching || undefined}
        disabled={disabled}
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
          "hover:bg-[#faf8f6] focus-visible:bg-[#faf8f6] focus-visible:outline-none",
          isActive && !isSwitching && "bg-[#faf8f6] font-semibold",
          isSwitching && "bg-primary/10 font-medium text-foreground ring-1 ring-primary/25"
        )}
      >
        {isSwitching ? (
          <Loader2Icon
            className="size-4 shrink-0 animate-spin text-primary"
            aria-hidden="true"
          />
        ) : (
          <CheckIcon
            className={cn(
              "size-4 shrink-0 text-primary",
              isActive ? "opacity-100" : "opacity-0"
            )}
            aria-hidden="true"
          />
        )}
        <span className="min-w-0 flex-1 truncate">{optionName}</span>
      </button>
    </li>
  )
}
