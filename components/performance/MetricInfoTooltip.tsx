"use client"

import { InfoIcon } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function MetricInfoTooltip({
  label,
  description,
}: {
  label: string
  description: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="inline-flex rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label={`Forklaring af ${label}`}
          >
            <InfoIcon className="size-3.5" />
          </button>
        }
      />
      <TooltipContent className="max-w-56 text-left leading-relaxed">
        {description}
      </TooltipContent>
    </Tooltip>
  )
}
