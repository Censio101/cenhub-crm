"use client"

import { useEffect, useMemo, useState } from "react"
import { da } from "date-fns/locale"
import type { DateRange as DayPickerRange } from "react-day-picker"
import { Building2Icon, CalendarIcon, ChevronDownIcon, FunnelIcon, WrenchIcon } from "lucide-react"
import { cn } from "cn"

import { useCompanyServices } from "@/components/account/AccountSettingsProvider"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DATE_PRESETS,
  comparisonModeLabel,
} from "@/lib/performance/date-ranges"
import { formatDateRangeLabel } from "@/lib/performance/format"
import {
  CUSTOMER_SEGMENTS,
  getCustomerSegmentLabel,
} from "@/lib/performance/customer-segments"
import type { CustomerSegmentId } from "@/lib/performance/customer-segments"
import { FUNNELS, getFunnelLabel } from "@/lib/performance/funnels"
import type { FunnelId } from "@/lib/performance/funnels"
import { getServiceLabel, isServiceId } from "@/lib/performance/services"
import type { ServiceId } from "@/lib/performance/services"
import type {
  ComparisonMode,
  DatePreset,
  DateRange,
} from "@/lib/performance/types"

const COMPARISON_MODES: { id: ComparisonMode; label: string }[] = [
  { id: "previous_period", label: "Forrige periode" },
  { id: "previous_year", label: "Sidste år" },
  { id: "custom", label: "Tilpasset" },
]

export function DateRangeControls({
  preset,
  range,
  comparisonEnabled,
  comparisonMode,
  comparisonRange,
  onPresetChange,
  onCustomRange,
  onComparisonChange,
  service,
  onServiceChange,
  funnel,
  onFunnelChange,
  segment,
  onSegmentChange,
}: {
  preset: DatePreset
  range: DateRange
  comparisonEnabled: boolean
  comparisonMode: ComparisonMode
  comparisonRange: DateRange | null
  onPresetChange: (preset: DatePreset) => void
  onCustomRange: (range: DateRange, target: "current" | "comparison") => void
  onComparisonChange: (next: {
    enabled: boolean
    mode: ComparisonMode
    customRange?: DateRange | null
  }) => void
  service: ServiceId | null
  onServiceChange: (service: ServiceId | null) => void
  funnel: FunnelId | null
  onFunnelChange: (funnel: FunnelId | null) => void
  segment: CustomerSegmentId | null
  onSegmentChange: (segment: CustomerSegmentId | null) => void
}) {
  const [draft, setDraft] = useState<DayPickerRange | undefined>()
  const [customOpen, setCustomOpen] = useState(false)
  const [comparisonDraft, setComparisonDraft] = useState<
    DayPickerRange | undefined
  >()
  const { enabledServiceIds, enabledServices } = useCompanyServices()

  useEffect(() => {
    if (service && !enabledServiceIds.includes(service)) {
      onServiceChange(null)
    }
  }, [enabledServiceIds, onServiceChange, service])

  const selectedPresetLabel = useMemo(
    () => DATE_PRESETS.find((item) => item.id === preset)?.label ?? "Periode",
    [preset]
  )

  return (
    <div className="flex flex-col items-stretch gap-3 sm:items-end">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-end">
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <div className="flex gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="dashboard-chip justify-between gap-2.5 px-4 sm:min-w-64"
                  />
                }
              >
                <CalendarIcon className="size-4 text-muted-foreground" />
                <span className="truncate">
                  {formatDateRangeLabel(range.start, range.end)}
                </span>
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dashboard-filter-menu min-w-56">
                <DropdownMenuLabel>Periode</DropdownMenuLabel>
                {DATE_PRESETS.filter((item) => item.id !== "custom").map(
                  (item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => onPresetChange(item.id)}
                    >
                      {item.label}
                      {preset === item.id ? (
                        <span className="ml-auto text-xs text-muted-foreground">
                          Valgt
                        </span>
                      ) : null}
                    </DropdownMenuItem>
                  )
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setDraft({ from: range.start, to: range.end })
                    setCustomOpen(true)
                  }}
                >
                  Tilpasset periode
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <PopoverTrigger className="sr-only" aria-hidden>
              Kalender
            </PopoverTrigger>
          </div>
          <PopoverContent className="w-auto p-2" align="end">
            <Calendar
              mode="range"
              locale={da}
              numberOfMonths={2}
              selected={draft}
              defaultMonth={range.start}
              onSelect={(next) => {
                setDraft(next)
                if (next?.from && next.to) {
                  onCustomRange({ start: next.from, end: next.to }, "current")
                  setCustomOpen(false)
                }
              }}
            />
          </PopoverContent>
        </Popover>

        <Select
          value={service ?? "all"}
          onValueChange={(value) => {
            if (typeof value !== "string" || value === "all") {
              onServiceChange(null)
              return
            }
            onServiceChange(value as ServiceId)
          }}
        >
          <SelectTrigger className="dashboard-chip min-w-44 px-4" aria-label="Filtrer på service">
            <WrenchIcon className="size-4 text-muted-foreground" />
            <SelectValue>{getServiceLabel(service)}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false} className="dashboard-filter-menu">
            <SelectItem value="all">Alle services</SelectItem>
            {enabledServices
              .filter((item) => isServiceId(item.id))
              .map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={funnel ?? "all"}
          onValueChange={(value) => {
            if (typeof value !== "string" || value === "all") {
              onFunnelChange(null)
              return
            }
            onFunnelChange(value as FunnelId)
          }}
        >
          <SelectTrigger className="dashboard-chip min-w-52 px-4" aria-label="Filtrer på funnel">
            <FunnelIcon className="size-4 text-muted-foreground" />
            <SelectValue>{getFunnelLabel(funnel)}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false} className="dashboard-filter-menu">
            <SelectItem value="all">Alle funnels</SelectItem>
            {FUNNELS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={segment ?? "all"}
          onValueChange={(value) => {
            if (typeof value !== "string" || value === "all") {
              onSegmentChange(null)
              return
            }
            onSegmentChange(value as CustomerSegmentId)
          }}
        >
          <SelectTrigger className="dashboard-chip min-w-40 px-4" aria-label="Filtrer på Privat/Erhverv">
            <Building2Icon className="size-4 text-muted-foreground" />
            <SelectValue>{getCustomerSegmentLabel(segment)}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false} className="dashboard-filter-menu">
            <SelectItem value="all">Privat/Erhverv</SelectItem>
            {CUSTOMER_SEGMENTS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={comparisonEnabled ? "default" : "outline"}
          className={
            comparisonEnabled
              ? "h-11 rounded-[5px] px-4"
              : "dashboard-chip px-4"
          }
          aria-pressed={comparisonEnabled}
          onClick={() =>
            onComparisonChange({
              enabled: !comparisonEnabled,
              mode: comparisonMode,
            })
          }
        >
          Sammenlign periode
        </Button>
      </div>

      <p className="text-xs text-muted-foreground sm:text-right">
        {selectedPresetLabel}
      </p>

      {comparisonEnabled ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" className="dashboard-chip px-4" />}
            >
              {comparisonModeLabel(comparisonMode)}
              <ChevronDownIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dashboard-filter-menu">
              {COMPARISON_MODES.map((mode) => (
                <DropdownMenuItem
                  key={mode.id}
                  onClick={() =>
                    onComparisonChange({
                      enabled: true,
                      mode: mode.id,
                      customRange:
                        mode.id === "custom" ? comparisonRange : undefined,
                    })
                  }
                >
                  {mode.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {comparisonRange ? (
            comparisonMode === "custom" ? (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button variant="ghost" size="sm" className="text-muted-foreground" />
                  }
                >
                  vs. {formatDateRangeLabel(comparisonRange.start, comparisonRange.end)}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="end">
                  <Calendar
                    mode="range"
                    locale={da}
                    numberOfMonths={1}
                    selected={
                      comparisonDraft ?? {
                        from: comparisonRange.start,
                        to: comparisonRange.end,
                      }
                    }
                    onSelect={(next) => {
                      setComparisonDraft(next)
                      if (next?.from && next.to) {
                        onCustomRange(
                          { start: next.from, end: next.to },
                          "comparison"
                        )
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <p className={cn("self-center text-xs text-muted-foreground")}>
                vs. {formatDateRangeLabel(comparisonRange.start, comparisonRange.end)}
              </p>
            )
          ) : (
            <p className="self-center text-xs text-muted-foreground">
              Ingen sammenligningsdata
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
