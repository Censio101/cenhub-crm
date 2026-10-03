export type PublicPackageTierId = "basisk-marketing" | "marketing-fundament" | "vaekstpakke"

export type PublicPackageTier = {
  id: PublicPackageTierId
  title: string
  /** Kort linje under pakkenavn på kortet / sticky opstart */
  titleSubline?: string
  stickyOpstart?: string
  /** Engangs onboarding / opstart (ekskl. moms) */
  onboardingFee: number
  /** Løbende pr. måned efter onboarding (ekskl. moms) */
  monthlyFee: number
  /** Visning af første måned før rabat (Vækst) */
  compareFirstMonth?: number
  /** Vist besparelse på marketing opstart (Vækst) */
  savingsAmount?: number
  steps: string[]
  /** Tid til forventet resultat (vist under ydelser) */
  expectedResultsRange: string
  /** Ekstra linje under forventet resultat (fx Vækst) */
  expectedResultsNote?: string
  /** Anden linje under expectedResultsNote */
  expectedResultsSubnote?: string
  featured?: boolean
  discountLabel?: string
}

export const PUBLIC_PACKAGE_TIER_ORDER: PublicPackageTierId[] = [
  "basisk-marketing",
  "vaekstpakke",
  "marketing-fundament",
]

export const PUBLIC_PACKAGE_TIERS: PublicPackageTier[] = [
  {
    id: "basisk-marketing",
    title: "Basisk pakke",
    onboardingFee: 8_500,
    monthlyFee: 5_000,
    steps: [
      "Onboarding",
      "Analyse & opsætning af Meta konto",
      "Strategi & eksekvering",
      "Udarbejdelse af basisk marketing annoncer",
      "Basisk tracking",
      "Månedlig marketing møde",
    ],
    expectedResultsRange: "1-3 måneder",
    stickyOpstart: "Forventet opstart inde for 2 uger.",
  },
  {
    id: "vaekstpakke",
    title: "Vækstpakke med video",
    titleSubline: "Forventet opstart inde for 1 uge.",
    onboardingFee: 21_000,
    monthlyFee: 5_000,
    compareFirstMonth: 35_000,
    savingsAmount: 14_000,
    featured: true,
    discountLabel: "40% rabat",
    steps: [
      "Video marketing dag: 5-10 videoer",
      "Udarbejdelse af marketing annoncer",
      "Lead håndtering & performance system",
      "Onboarding",
      "Analyse & opsætning af Meta konto",
      "Konkurrence Analyse",
      "Branche analyse",
      "Strategi & eksekvering",
      "Server site tracking",
      "Månedlig marketing møde",
    ],
    expectedResultsRange: "1 MÅNED",
    expectedResultsNote: "Gennemsnit kunderesultater: 8x",
    expectedResultsSubnote: "20-40 kvalificerede kundehenvendelser pr måned.",
  },
  {
    id: "marketing-fundament",
    title: "Fundament pakke",
    onboardingFee: 17_500,
    monthlyFee: 5_000,
    steps: [
      "Udarbejdelse af marketing annoncer",
      "Lead håndtering & performance system",
      "Onboarding",
      "Analyse & opsætning af Meta konto",
      "Konkurrence Analyse",
      "Branche analyse",
      "Strategi & eksekvering",
      "Server site tracking",
      "Månedlig marketing møde",
    ],
    expectedResultsRange: "1-2 måneder",
    stickyOpstart: "Forventet opstart inde for 1-2 uger.",
  },
]

export function publicPackageTierById(id: PublicPackageTierId): PublicPackageTier | undefined {
  return PUBLIC_PACKAGE_TIERS.find((tier) => tier.id === id)
}

const TIER_COMPETITOR_ANALYSIS_STEP = "Konkurrence Analyse"
const TIER_INDUSTRY_ANALYSIS_STEP = "Branche analyse"

const TIER_LEAD_SYSTEM_STEP = "Lead håndtering & performance system"

const TIER_VIDEO_MARKETING_STEP = "Video marketing dag: 5-10 videoer"

/** Vækst- og Fundament-pakken, ikke Basisk */
export function tierIncludesLeadSystem(tier: Pick<PublicPackageTier, "steps">): boolean {
  return tier.steps.includes(TIER_LEAD_SYSTEM_STEP)
}

/** Vækst- og Fundament-pakken, ikke Basisk */
export function tierIncludesMarketAnalysis(tier: Pick<PublicPackageTier, "steps">): boolean {
  return (
    tier.steps.includes(TIER_COMPETITOR_ANALYSIS_STEP) &&
    tier.steps.includes(TIER_INDUSTRY_ANALYSIS_STEP)
  )
}

/** Kun Vækstpakke med video */
export function tierIncludesVideoMarketing(tier: Pick<PublicPackageTier, "steps">): boolean {
  return tier.steps.includes(TIER_VIDEO_MARKETING_STEP)
}

export function formatTierPriceLabel(price: number) {
  return new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(price)
}

export function tierFirstMonthTotal(tier: Pick<PublicPackageTier, "onboardingFee" | "monthlyFee">) {
  return tier.onboardingFee + tier.monthlyFee
}

export const PUBLIC_TIER_FIRST_LEADS_LABEL =
  "Første kundehenvendelser: 2-4 uger efter underskrevet kontrakt"

export const PUBLIC_TIER_META_ADS_SPEND_LABEL =
  "Forventet Meta ads spend: 5.000-10.000 kr pr md."

export function publicTierOpstartLabel(tier: PublicPackageTier): string {
  return tier.titleSubline ?? tier.stickyOpstart ?? "Forventet opstart efter underskrift"
}
