"use client"

import { ListChecksIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  LeadSheetFilterMenu,
  LeadSheetFilterMenuItem,
} from "@/components/leads/LeadSheetFilterMenu"
import type { FormFilterValue } from "@/lib/leads/form-filter"

/** Complete / Partial filter for sheets with a stepped form (the shared sheet filter menu). */
export function LeadSheetFormFilter({
  value,
  onChange,
}: {
  value: FormFilterValue
  onChange: (next: FormFilterValue) => void
}) {
  const { t } = useLanguage()
  const valueLabel =
    value === "complete" ? t("filterFormComplete") : value === "partial" ? t("filterFormPartial") : ""

  return (
    <LeadSheetFilterMenu
      icon={<ListChecksIcon />}
      label={t("leadSheetFilterLabelForm")}
      ariaLabel={t("filterFormAria")}
      active={value !== "all"}
      valueLabel={valueLabel}
    >
      <LeadSheetFilterMenuItem selected={value === "all"} onSelect={() => onChange("all")}>
        {t("filterFormAll")}
      </LeadSheetFilterMenuItem>
      <LeadSheetFilterMenuItem selected={value === "complete"} onSelect={() => onChange("complete")}>
        {t("filterFormComplete")}
      </LeadSheetFilterMenuItem>
      <LeadSheetFilterMenuItem selected={value === "partial"} onSelect={() => onChange("partial")}>
        {t("filterFormPartial")}
      </LeadSheetFilterMenuItem>
    </LeadSheetFilterMenu>
  )
}
