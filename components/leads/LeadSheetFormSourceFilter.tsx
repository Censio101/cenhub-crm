"use client"

import { FileInputIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  LeadSheetFilterMenu,
  LeadSheetFilterMenuItem,
} from "@/components/leads/LeadSheetFilterMenu"

/** Which webhook/form created the lead (distinct from platform "Kilde"). */
export function LeadSheetFormSourceFilter({
  options,
  value,
  onChange,
}: {
  options: readonly string[]
  value: string | "all"
  onChange: (next: string | "all") => void
}) {
  const { t } = useLanguage()
  const valueLabel = value === "all" ? "" : value

  return (
    <LeadSheetFilterMenu
      icon={<FileInputIcon />}
      label={t("leadSheetFilterLabelFormSource")}
      ariaLabel={t("filterFormSourceAria")}
      active={value !== "all"}
      valueLabel={valueLabel}
    >
      <LeadSheetFilterMenuItem selected={value === "all"} onSelect={() => onChange("all")}>
        {t("filterFormSourceAll")}
      </LeadSheetFilterMenuItem>
      {options.map((label) => (
        <LeadSheetFilterMenuItem
          key={label}
          selected={value === label}
          onSelect={() => onChange(label)}
        >
          {label}
        </LeadSheetFilterMenuItem>
      ))}
    </LeadSheetFilterMenu>
  )
}
