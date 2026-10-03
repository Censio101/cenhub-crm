import type { CSSProperties, ReactNode } from "react"

import { Card } from "@/components/ui/card"
import { cn } from "cn"

type KpiIcon = (props: {
  className?: string
  style?: CSSProperties
  "aria-hidden"?: boolean | "true"
}) => ReactNode

export function InternalKpiCard({
  label,
  value,
  icon: Icon,
  color,
  dense = false,
  change,
  changeUp,
}: {
  label: string
  value: string
  icon: KpiIcon
  color?: string
  dense?: boolean
  change?: string
  changeUp?: boolean
}) {
  return (
    <Card size="sm" className="dashboard-card kpi-card gap-0 py-5">
      <div className="px-5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="kpi-icon mt-0.5" style={color ? { color } : undefined}>
            <Icon className="size-5" style={color ? { color } : undefined} aria-hidden />
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "font-medium tracking-tight text-[#141414]",
                dense ? "text-sm leading-snug" : "truncate text-xl"
              )}
            >
              {label}
            </p>
            <p
              className={cn(
                "mt-1.5 leading-none font-semibold tracking-tight text-[#141414] tabular-nums",
                dense ? "text-[1.65rem]" : "text-[2.35rem]"
              )}
            >
              {value}
            </p>
            {change ? (
              <p
                className={cn(
                  "mt-2 text-sm font-medium tabular-nums",
                  changeUp === undefined
                    ? "text-[var(--text-secondary)]"
                    : changeUp
                      ? "text-[#1f8a62]"
                      : "text-[#c24545]"
                )}
              >
                {change}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  )
}
