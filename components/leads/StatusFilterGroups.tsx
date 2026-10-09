"use client"

import { Fragment } from "react"
import { CircleDotIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  LeadSheetFilterMenu,
  LeadSheetFilterMenuHeading,
  LeadSheetFilterMenuItem,
} from "@/components/leads/LeadSheetFilterMenu"
import { leadStatusLabelKey } from "@/lib/lead-sheet/lead-labels"
import type { LeadStatusId } from "@/lib/leads"
import {
  STATUS_FILTER_GROUPS,
  countForGroup,
  parseGroupUnionFilter,
  type StatusFilterValue,
} from "@/lib/leads/status-filter-groups"

const STATUS_DOT: Record<LeadStatusId, string> = {
  new_waiting_call: "bg-[#f0a05a]",
  call_1: "bg-[#b8956a]",
  call_2: "bg-[#b8956a]",
  call_3: "bg-[#b8956a]",
  call_4: "bg-[#b8956a]",
  call_5: "bg-[#b8956a]",
  waiting_on_client: "bg-[#7eace8]",
  client_waiting_on_us: "bg-[#f0a05a]",
  awaiting_proposal: "bg-[#e8c547]",
  proposal_sent: "bg-[#7eace8]",
  won: "bg-[#6fbf86]",
  lost: "bg-[#e88b7d]",
  not_qualified: "bg-[#d4d1cb]",
}

/** Status filter as a grouped dropdown (same look as the other sheet filters). */
export function StatusFilterGroups({
  counts,
  value,
  onChange,
}: {
  counts: Partial<Record<LeadStatusId, number>>
  value: StatusFilterValue
  onChange: (next: StatusFilterValue) => void
}) {
  const { t } = useLanguage()

  let valueLabel = ""
  if (value !== "all") {
    const unionGroup = parseGroupUnionFilter(value)
    const unionMeta = unionGroup ? STATUS_FILTER_GROUPS.find((g) => g.id === unionGroup) : undefined
    valueLabel = unionMeta
      ? t(unionMeta.labelKey)
      : t(leadStatusLabelKey(value as LeadStatusId))
  }

  return (
    <LeadSheetFilterMenu
      icon={<CircleDotIcon />}
      label={t("leadSheetColStatus")}
      ariaLabel={t("leadSheetFilterStatusAria")}
      active={value !== "all"}
      valueLabel={valueLabel}
      menuClassName="min-w-64"
    >
      <LeadSheetFilterMenuItem
        selected={value === "all"}
        count={countForGroup(counts, "all")}
        onSelect={() => onChange("all")}
      >
        {t("leadSheetFilterAllStatuses")}
      </LeadSheetFilterMenuItem>

      {STATUS_FILTER_GROUPS.map((group) => (
        <Fragment key={group.id}>
          <LeadSheetFilterMenuHeading>{t(group.labelKey)}</LeadSheetFilterMenuHeading>
          {group.statuses.map((statusId) => {
            const n = counts[statusId] ?? 0
            const selected = value === statusId
            if (group.id === "calls" && n === 0 && !selected) return null
            return (
              <LeadSheetFilterMenuItem
                key={statusId}
                selected={selected}
                muted={n === 0 && !selected}
                dotClassName={STATUS_DOT[statusId]}
                count={n}
                onSelect={() => onChange(statusId)}
              >
                {t(leadStatusLabelKey(statusId))}
              </LeadSheetFilterMenuItem>
            )
          })}
        </Fragment>
      ))}
    </LeadSheetFilterMenu>
  )
}
