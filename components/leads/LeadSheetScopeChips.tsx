"use client"

import { Building2Icon, MegaphoneIcon, WrenchIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  LeadSheetFilterMenu,
  LeadSheetFilterMenuItem,
} from "@/components/leads/LeadSheetFilterMenu"
import type { LeadSegmentId } from "@/lib/leads"
import { FUNNELS } from "@/lib/performance/funnels"
import type { FunnelId } from "@/lib/performance/funnels"
import { FUNNEL_MESSAGE_KEYS } from "@/lib/performance/funnel-i18n"
import type { NamedService } from "@/lib/performance/services"

/** Segment, service and lead-source filters — all built on the shared sheet filter menu. */
export function LeadSheetScopeChips({
  sheetSegment,
  onSheetSegmentChange,
  sheetService,
  onSheetServiceChange,
  sheetFunnel,
  onSheetFunnelChange,
  enabledServices,
  servicesLoaded,
}: {
  sheetSegment: LeadSegmentId | "all"
  onSheetSegmentChange: (segment: LeadSegmentId | "all") => void
  sheetService: string | null
  onSheetServiceChange: (slug: string | null) => void
  sheetFunnel: FunnelId | "all"
  onSheetFunnelChange: (funnel: FunnelId | "all") => void
  enabledServices: readonly NamedService[]
  servicesLoaded: boolean
}) {
  const { t } = useLanguage()

  const segmentValue =
    sheetSegment === "b2b" ? t("filterSegmentB2b") : sheetSegment === "b2c" ? t("filterSegmentB2c") : ""
  const serviceValue = sheetService
    ? (enabledServices.find((s) => s.id === sheetService)?.label ?? sheetService)
    : ""
  const funnelValue = sheetFunnel === "all" ? "" : t(FUNNEL_MESSAGE_KEYS[sheetFunnel])

  return (
    <>
      <LeadSheetFilterMenu
        icon={<Building2Icon />}
        label={t("leadSheetFilterLabelSegment")}
        ariaLabel={t("filterSegmentAria")}
        active={sheetSegment !== "all"}
        valueLabel={segmentValue}
      >
        <LeadSheetFilterMenuItem
          selected={sheetSegment === "all"}
          onSelect={() => onSheetSegmentChange("all")}
        >
          {t("filterSegmentAll")}
        </LeadSheetFilterMenuItem>
        <LeadSheetFilterMenuItem
          selected={sheetSegment === "b2c"}
          onSelect={() => onSheetSegmentChange("b2c")}
        >
          {t("filterSegmentB2c")}
        </LeadSheetFilterMenuItem>
        <LeadSheetFilterMenuItem
          selected={sheetSegment === "b2b"}
          onSelect={() => onSheetSegmentChange("b2b")}
        >
          {t("filterSegmentB2b")}
        </LeadSheetFilterMenuItem>
      </LeadSheetFilterMenu>

      <LeadSheetFilterMenu
        icon={<WrenchIcon />}
        label={t("leadSheetFilterLabelService")}
        ariaLabel={t("filterServiceAria")}
        active={Boolean(sheetService)}
        valueLabel={serviceValue}
        disabled={!servicesLoaded}
      >
        <LeadSheetFilterMenuItem
          selected={!sheetService}
          onSelect={() => onSheetServiceChange(null)}
        >
          {t("filterAllServices")}
        </LeadSheetFilterMenuItem>
        {enabledServices.map((item) => (
          <LeadSheetFilterMenuItem
            key={item.id}
            selected={sheetService === item.id}
            onSelect={() => onSheetServiceChange(item.id)}
          >
            {item.label}
          </LeadSheetFilterMenuItem>
        ))}
      </LeadSheetFilterMenu>

      <LeadSheetFilterMenu
        icon={<MegaphoneIcon />}
        label={t("leadSheetFilterLabelSource")}
        ariaLabel={t("filterFunnelAria")}
        active={sheetFunnel !== "all"}
        valueLabel={funnelValue}
      >
        <LeadSheetFilterMenuItem
          selected={sheetFunnel === "all"}
          onSelect={() => onSheetFunnelChange("all")}
        >
          {t("filterFunnelAll")}
        </LeadSheetFilterMenuItem>
        {FUNNELS.map((item) => (
          <LeadSheetFilterMenuItem
            key={item.id}
            selected={sheetFunnel === item.id}
            onSelect={() => onSheetFunnelChange(item.id)}
          >
            {t(FUNNEL_MESSAGE_KEYS[item.id])}
          </LeadSheetFilterMenuItem>
        ))}
      </LeadSheetFilterMenu>
    </>
  )
}
