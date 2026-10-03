import { LEAD_SYSTEM_ESTABLISHMENT, LEAD_SYSTEM_MONTHLY } from "@/lib/internal/offer-modules"
import {
  publicPackageTierById,
  tierIncludesVideoMarketing,
  type PublicPackageTier,
  type PublicPackageTierId,
} from "@/lib/internal/offer-public-package-tiers"
import type { OfferServiceId } from "@/lib/onboarding/types"

const WEBSITE_ESTABLISHMENT = 10_000
const WEBSITE_HOSTING_MONTHLY = 250

export type EditorialPriceLine = {
  label: string
  amount: number
  compareAmount?: number
}

export type EditorialPricingSummary = {
  establishmentLines: EditorialPriceLine[]
  establishmentTotal: number
  establishmentCompareTotal?: number
  establishmentDiscountLabel?: string
  establishmentSavingsAmount?: number
  subscriptionLines: EditorialPriceLine[]
  subscriptionTotal: number
  metaSpendLabel: string
  metaSpendRange: string
  packageTitle: string
  /** Etablering + første måneds abonnement (ekskl. Meta spend) */
  firstMonthTotal: number
  firstMonthCompareTotal?: number
}

function packageEstablishmentLine(tier: PublicPackageTier): EditorialPriceLine {
  const compareAmount =
    tier.savingsAmount != null ? tier.onboardingFee + tier.savingsAmount : undefined
  return {
    label: tier.title,
    amount: tier.onboardingFee,
    compareAmount,
  }
}

export function buildEditorialPricingSummary(
  tierId: PublicPackageTierId,
  services: OfferServiceId[]
): EditorialPricingSummary | null {
  const tier = publicPackageTierById(tierId)
  if (!tier) return null

  const hasVideo = tierIncludesVideoMarketing(tier)
  const establishmentLines: EditorialPriceLine[] = [packageEstablishmentLine(tier)]

  if (!hasVideo && services.includes("hjemmeside")) {
    establishmentLines.push({
      label: "Professionel hjemmeside",
      amount: WEBSITE_ESTABLISHMENT,
    })
  }

  if (!hasVideo && services.includes("lead-system") && LEAD_SYSTEM_ESTABLISHMENT > 0) {
    establishmentLines.push({
      label: "Censio Lead, opsætning",
      amount: LEAD_SYSTEM_ESTABLISHMENT,
    })
  }

  const establishmentTotal = establishmentLines.reduce((sum, line) => sum + line.amount, 0)
  const establishmentCompareTotal = establishmentLines.reduce(
    (sum, line) => sum + (line.compareAmount ?? line.amount),
    0
  )

  const subscriptionLines: EditorialPriceLine[] = [
    { label: "Censio marketing retainer", amount: tier.monthlyFee },
  ]

  if (!hasVideo && (services.includes("hjemmeside") || services.includes("hosting"))) {
    subscriptionLines.push({
      label: "Hosting, plugins & sikkerhed",
      amount: WEBSITE_HOSTING_MONTHLY,
    })
  }

  if (services.includes("lead-system") && LEAD_SYSTEM_MONTHLY > 0) {
    subscriptionLines.push({ label: "Censio Lead", amount: LEAD_SYSTEM_MONTHLY })
  }

  const subscriptionTotal = subscriptionLines.reduce((sum, line) => sum + line.amount, 0)
  const firstMonthTotal = establishmentTotal + subscriptionTotal
  const firstMonthCompareTotal =
    establishmentCompareTotal != null && establishmentCompareTotal > establishmentTotal
      ? establishmentCompareTotal + subscriptionTotal
      : undefined

  return {
    establishmentLines,
    establishmentTotal,
    establishmentCompareTotal:
      establishmentCompareTotal > establishmentTotal ? establishmentCompareTotal : undefined,
    establishmentDiscountLabel: hasVideo ? tier.discountLabel : undefined,
    establishmentSavingsAmount: hasVideo ? tier.savingsAmount : undefined,
    subscriptionLines,
    subscriptionTotal,
    metaSpendLabel: "Forventet Meta ads spend",
    metaSpendRange: "5.000-10.000 kr pr md.",
    packageTitle: tier.title,
    firstMonthTotal,
    firstMonthCompareTotal,
  }
}
