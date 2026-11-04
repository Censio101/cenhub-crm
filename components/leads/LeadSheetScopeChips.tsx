"use client"

import { MegaphoneIcon, WrenchIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  LeadSheetFilterMenu,
  LeadSheetFilterMenuItem,
} from "@/components/leads/LeadSheetFilterMenu"
import { FUNNELS } from "@/lib/performance/funnels"
import type { FunnelId } from "@/lib/performance/funnels"
import { FUNNEL_MESSAGE_KEYS } from "@/lib/performance/funnel-i18n"
import type { NamedService } from "@/lib/performance/services"

/** Service and lead-source filters — built on the shared sheet filter menu. */
export function LeadSheetScopeChips({
  sheetService,
  onSheetServiceChange,
  sheetFunnel,
  onSheetFunnelChange,
  enabledServices,
  servicesLoaded,
  showServiceFilter = true,
  showSourceFilter = true,
}: {
  sheetService: string | null
  onSheetServiceChange: (slug: string | null) => void
  sheetFunnel: FunnelId | "all"
  onSheetFunnelChange: (funnel: FunnelId | "all") => void
  enabledServices: readonly NamedService[]
  servicesLoaded: boolean
  showServiceFilter?: boolean
  showSourceFilter?: boolean
}) {
  const { t } = useLanguage()

  const serviceValue = sheetService
    ? (enabledServices.find((s) => s.id === sheetService)?.label ?? sheetService)
    : ""
  const funnelValue = sheetFunnel === "all" ? "" : t(FUNNEL_MESSAGE_KEYS[sheetFunnel])

  return (
    <>
      {showServiceFilter ? (
        <LeadSheetFilterMenu
          icon={<WrenchIcon />}
          label={t("leadSheetFilterLabelService")}
          ariaLabel={t("filterServiceAria")}
          active={Boolean(sheetService)}
          valueLabel={serviceValue}
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
      ) : null}

      {showSourceFilter ? (
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
      ) : null}
    </>
  )
}
