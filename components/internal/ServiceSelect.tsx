"use client"

import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CENSIO_SERVICES, type ServiceId } from "@/lib/internal/services"

const SERVICE_LABELS: Record<ServiceId, string> = {
  meta: "Meta ads",
  google: "Google ads",
  video: "Video",
  seo: "SEO",
  geo: "GEO",
  hjemmeside: "Hjemmeside",
  webshop: "Webshop",
  hosting: "Hosting",
  support: "Support pakke",
}

export function ServiceSelect({
  value,
  onChange,
  className,
  wrapperClassName,
  label = "Service",
}: {
  value: ServiceId[]
  onChange: (value: ServiceId[]) => void
  className?: string
  wrapperClassName?: string
  label?: string
}) {
  const chosen = CENSIO_SERVICES.filter((item) => value.includes(item.id))
  const summary = chosen.length === 0 ? "Alle" : chosen.map((item) => SERVICE_LABELS[item.id]).join(", ")
  const SelectedIcon = chosen.length === 1 ? chosen[0]?.icon : null

  return (
    <div className={wrapperClassName ?? "grid min-w-0 gap-1.5 text-sm text-[var(--text-secondary)]"}>
      <span>{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className={className ?? "dashboard-chip w-full justify-between px-4 sm:w-52"}
              aria-label={label}
            />
          }
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            {SelectedIcon && chosen[0] ? (
              <SelectedIcon className="size-4 shrink-0" style={{ color: chosen[0].color }} aria-hidden />
            ) : null}
            <span className="truncate">{summary}</span>
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuCheckboxItem checked={value.length === 0} onCheckedChange={() => onChange([])}>
            Alle services
          </DropdownMenuCheckboxItem>
          {CENSIO_SERVICES.map((item) => (
            <DropdownMenuCheckboxItem
              key={item.id}
              checked={value.length === 0 || value.includes(item.id)}
              onCheckedChange={() =>
                onChange(
                  (() => {
                    const active = value.length === 0 ? CENSIO_SERVICES.map((entry) => entry.id) : value
                    const next = active.includes(item.id)
                      ? active.filter((id) => id !== item.id)
                      : [...active, item.id]
                    return next.length === 0 || next.length === CENSIO_SERVICES.length ? [] : next
                  })()
                )
              }
            >
              <item.icon className="size-4" style={{ color: item.color }} aria-hidden />
              {SERVICE_LABELS[item.id]}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
