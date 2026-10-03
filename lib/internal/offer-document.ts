import type { OfferPackage } from "@/lib/internal/offer-packages"
import { LEAD_SYSTEM_ESTABLISHMENT, LEAD_SYSTEM_MONTHLY } from "@/lib/internal/offer-modules"
import type { OfferPackageId, OfferServiceId } from "@/lib/onboarding/types"

export type OfferCoverStat = {
  value: string
  label: string
}

export type OfferFeatureBlock = {
  title: string
  body: string
  note?: string
}

export type OfferDocumentPhase = {
  id: string
  label: string
  title: string
  intro: string
  processSteps?: string[]
  features?: OfferFeatureBlock[]
  /** Kun relevant for disse pakker (tom = alle) */
  packageIds?: OfferPackageId[]
  /** Kræver tillægsydelse */
  requiresService?: OfferServiceId
}

export const OFFER_COVER_STATS: OfferCoverStat[] = [
  { value: "+200", label: "Hjemmesider & webshops udviklet" },
  { value: "+10 år", label: "Arbejdet med digital vækst" },
  { value: "+200", label: "Virksomheder hjulpet" },
]

export const WEBSITE_PHASE: OfferDocumentPhase = {
  id: "website",
  label: "Fase 1",
  title: "Professionel hjemmeside",
  intro:
    "Med en professionel hjemmeside får I et skræddersyet design, optimeret til mobil, tablet og computer. Hjemmesiden er udviklet med fokus på troværdighed og et stilrent udtryk, og strategisk opbygget til at guide potentielle kunder gennem en veltilrettelagt kunderejse.",
  processSteps: ["Konverteringsoptimering", "Udvikling og finpudsning", "Lancering & forbedring af SEO"],
  features: [
    {
      title: "Professionelt design",
      body: "Vi kombinerer jeres brand og styrker jeres online identitet.",
      note: "Op til 10 sider",
    },
    {
      title: "Mobil, tablet & PC",
      body: "Fuld responsiv oplevelse på alle enheder.",
    },
    {
      title: "Hurtig hjemmeside",
      body: "LiteSpeed caching og optimeret performance på tværs af enheder.",
    },
    {
      title: "Konverteringsoptimeret",
      body: "Struktur der guider besøgende gennem kunderejsen.",
    },
    {
      title: "SEO-fundament",
      body: "Teknisk SEO-struktur med fokus på de søgeord jeres kunder bruger.",
    },
    {
      title: "Sikkerhed & GDPR",
      body: "Basisk sikkerhed og Cookiebot-opsætning.",
    },
  ],
  requiresService: "hjemmeside",
}

export const MARKETING_PHASES: OfferDocumentPhase[] = [
  {
    id: "analysis",
    label: "Fase 1",
    title: "Markeds- & konkurrentanalyse",
    intro:
      "Vores analyse identificerer styrker og svagheder på markedet, så vi kan finjustere jeres marketingstrategi. Ved at forstå konkurrenterne optimerer vi løsninger, der skaber bedre resultater og en stærkere markedsposition.",
    processSteps: ["Find konkurrenter", "Analyser", "Idégenerering", "Eksekvering"],
  },
  {
    id: "marketing",
    label: "Fase 2",
    title: "Marketing",
    intro:
      "Vi skaber målrettede marketingkampagner på Meta (og Google efter behov), der når jeres målgruppe og optimerer budgettet. Med data-drevne strategier og løbende justeringer sikrer vi synlighed, trafik og målbare resultater.",
    processSteps: ["Onboarding", "Marketinganalyse", "Opsætning & eksekvering", "Performancejustering"],
  },
  {
    id: "meta-ads",
    label: "Fase 2",
    title: "Paid social / Meta ads",
    intro:
      "Gennem data-drevne strategier og kontinuerlig optimering skaber vi øget synlighed, højere trafik og forbedrede nøgletal, med fokus på profitabel skalering frem for tom toplinje.",
    features: [
      {
        title: "Strategi & rådgivning",
        body: "Målrettet annoncestrategi og løbende sparring for synlighed, konverteringer og effektiv budgetudnyttelse.",
      },
      {
        title: "Opsætning og justering",
        body: "Vi opsætter kampagner, tracker profitabelt og skalerer efter bundlinjen.",
      },
      {
        title: "Løbende overvågning",
        body: "Profitjustering og optimering, så budgettet arbejder mest effektivt.",
      },
      {
        title: "Annoncekreativer",
        body: "Kreativer ud fra strategien, jeres materiale eller nyt indhold fra os.",
      },
      {
        title: "Månedlig rapport",
        body: "Detaljeret rapport og gennemgang med optimeringsforslag hver måned.",
      },
      {
        title: "Backend-kommunikation",
        body: "Direkte adgang via kunde-Discord med prioriterede svar.",
      },
    ],
  },
  {
    id: "video",
    label: "Fase 3",
    title: "Vækst fundament, video marketing",
    intro:
      "Vi producerer video og billeder med fokus på salg, kendskab og stærkt brand, og implementerer materialet direkte i markedsføringsstrategien.",
    packageIds: ["vaekstpakke"],
    features: [
      {
        title: "Video marketing shoot",
        body: "Koncept, optagelser og implementering i jeres vækstplan.",
      },
      {
        title: "Video & udstyr",
        body: "Vi kommer til jer og skyder 5–10 marketingvideoer med kamera, lyd, lys og scripts.",
      },
      {
        title: "Udarbejdelse af kreativer",
        body: "Redigering og lancering i jeres kampagner.",
      },
      {
        title: "Retigheder",
        body: "I ejer fulde rettigheder til alt materiale skabt i samarbejdet.",
      },
    ],
  },
]

export const OFFER_NO_BINDING =
  "Ingen binding. I kan opsige samarbejdet eller en enkelt ydelse med virkning efter løbende måned + 30 dage."

export const OFFER_NO_BINDING_DETAIL =
  "Der er ingen bindingsperiode i denne aftale. Kunden har mulighed for at opsige samarbejdet eller en service med virkning inden for den løbende måned + 30 dage."

export function projectContractPaymentItems(options: {
  services: OfferServiceId[]
  includesVideo: boolean
}) {
  const items = ["marketing", "onboarding"]
  if (options.services.includes("hjemmeside")) items.unshift("hjemmeside")
  if (options.includesVideo) items.push("video")
  return items
}

export function buildProjectContractSections(options: {
  services: OfferServiceId[]
  includesVideo: boolean
}) {
  const paid = projectContractPaymentItems(options)
  const paidLabel =
    paid.length > 1
      ? `${paid.slice(0, -1).join(", ")} og ${paid[paid.length - 1]}`
      : paid[0] ?? "de aftalte ydelser"

  return {
    start: [
      `Censio igangsætter projektet og samarbejdet, når betalingen for ${paidLabel} er modtaget.`,
      "Dette sikrer, at vi kan dedikere vores fulde fokus og ressourcer til at levere optimale resultater.",
      "Kunden er ansvarlig for at betale for annonce spend og for at kontakte og sende tilbud til leads.",
    ],
    cancellation: [
      OFFER_NO_BINDING_DETAIL,
      "Censio forbeholder sig retten til at opsige samarbejdsaftalen med en måneds varsel.",
    ],
    validity: ["Tilbuddet er gældende 45 dage efter modtagelse."],
    precedence:
      "Dette tilbud udgør en del af aftalegrundlaget sammen med handelsbetingelserne nedenfor. Ved modstrid gælder tilbuddets særlige vilkår (herunder opsigelse uden binding som angivet ovenfor).",
  }
}

export const OFFER_TERMS_START = [
  "Censio igangsætter projektet og samarbejdet, når betaling for de aftalte ydelser er modtaget. Det sikrer, at vi kan dedikere fuld fokus og ressourcer til at levere optimale resultater.",
  "Kunden er ansvarlig for at betale annonce spend (Meta/Google) og for at kontakte og sende tilbud til leads.",
] as const

export const OFFER_TERMS_CANCELLATION = [
  OFFER_NO_BINDING,
  "Censio forbeholder sig retten til at opsige samarbejdsaftalen med en måneds varsel.",
] as const

export const OFFER_TERMS_FOOTER = [
  "Tilbuddet er gældende 45 dage efter modtagelse.",
] as const

/** @deprecated Brug OFFER_TERMS_START + OFFER_TERMS_CANCELLATION */
export const OFFER_TERMS = [
  ...OFFER_TERMS_START,
  ...OFFER_TERMS_CANCELLATION,
  ...OFFER_TERMS_FOOTER,
  "Yderligere betingelser: censio.dk/handelsbetingelser.",
] as const

const WEBSITE_ESTABLISHMENT = 10_000
const WEBSITE_HOSTING_MONTHLY = 250
const META_COLLAB_MONTHLY = 5_000
const ONBOARDING_ESTABLISHMENT = 3_500
const VIDEO_MARKETING_ESTABLISHMENT = 9_500

export function buildDocumentPhases(services: OfferServiceId[]): OfferDocumentPhase[] {
  const hasWebsite = services.includes("hjemmeside")
  let phase = hasWebsite ? 2 : 1
  const phases: OfferDocumentPhase[] = []

  if (hasWebsite) {
    phases.push({ ...WEBSITE_PHASE, label: "Fase 1" })
  }

  const [analysis, marketing, metaAds, video] = MARKETING_PHASES

  phases.push({ ...analysis, label: `Fase ${phase}` })
  phase += 1

  phases.push({ ...marketing, label: `Fase ${phase}` })
  phases.push({ ...metaAds, label: `Fase ${phase}` })
  phase += 1

  phases.push({ ...video, label: `Fase ${phase}` })

  return phases
}

export function phaseVisibleForPackage(phase: OfferDocumentPhase, packageId: OfferPackageId) {
  if (!phase.packageIds || phase.packageIds.length === 0) return true
  return phase.packageIds.includes(packageId)
}

export function phaseVisibleForServices(phase: OfferDocumentPhase, services: OfferServiceId[]) {
  if (!phase.requiresService) return true
  return services.includes(phase.requiresService)
}

export type EstablishmentLine = { label: string; amount: number }

export function establishmentLines(
  pkg: OfferPackage,
  services: OfferServiceId[]
): EstablishmentLine[] {
  const lines: EstablishmentLine[] = []

  if (services.includes("hjemmeside")) {
    lines.push({ label: "Professionel hjemmeside", amount: WEBSITE_ESTABLISHMENT })
  }

  if (services.includes("lead-system") && LEAD_SYSTEM_ESTABLISHMENT > 0) {
    lines.push({ label: "CenHub Lead, opsætning", amount: LEAD_SYSTEM_ESTABLISHMENT })
  }

  const core = Math.max(0, pkg.price - ONBOARDING_ESTABLISHMENT - VIDEO_MARKETING_ESTABLISHMENT)
  if (core > 0) {
    lines.push({ label: "Vækst pakke", amount: core })
  }
  lines.push({ label: "Video pakke", amount: VIDEO_MARKETING_ESTABLISHMENT })
  lines.push({ label: "Onboarding", amount: ONBOARDING_ESTABLISHMENT })

  return lines
}

export function establishmentTotal(lines: EstablishmentLine[]) {
  return lines.reduce((sum, line) => sum + line.amount, 0)
}

export type SubscriptionLine = { label: string; amount: number; note?: string }

export function subscriptionLines(
  services: OfferServiceId[],
  pkg?: OfferPackage
): SubscriptionLine[] {
  const monthly = pkg?.monthlyRetainer ?? META_COLLAB_MONTHLY
  const retainerLabel = pkg?.monthlyRetainerLabel ?? "Meta ads samarbejde"
  const spendRange = pkg?.expectedAdSpend ?? "5.000–10.000 kr"

  const lines: SubscriptionLine[] = [{ label: retainerLabel, amount: monthly }]

  if (services.includes("hjemmeside") || services.includes("hosting")) {
    lines.push({
      label: "Hosting, plugins & sikkerhed",
      amount: WEBSITE_HOSTING_MONTHLY,
      note: "Licenser og backup inkluderet",
    })
  }

  if (services.includes("lead-system") && LEAD_SYSTEM_MONTHLY > 0) {
    lines.push({ label: "CenHub Lead", amount: LEAD_SYSTEM_MONTHLY })
  }

  lines.push({
    label: "Forventet annoncespend",
    amount: 0,
    note: `Ca. ${spendRange} pr. md. (betales direkte til Meta)`,
  })

  return lines
}

export function subscriptionTotal(lines: SubscriptionLine[]) {
  return lines.filter((line) => line.amount > 0).reduce((sum, line) => sum + line.amount, 0)
}

export function offerValidUntil(isoDate: string) {
  const base = new Date(isoDate)
  if (Number.isNaN(base.getTime())) return null
  const until = new Date(base)
  until.setDate(until.getDate() + 45)
  return until
}

export type OfferProjectOverview = {
  establishmentLines: EstablishmentLine[]
  establishmentTotal: number
  subscriptionLines: SubscriptionLine[]
  subscriptionTotal: number
  metaSpendNote: string
}

export function projectOverview(
  pkg: OfferPackage,
  services: OfferServiceId[]
): OfferProjectOverview {
  const est = establishmentLines(pkg, services)
  const sub = subscriptionLines(services, pkg)
  const meta = sub.find((line) => line.amount === 0 && line.note)?.note ?? ""

  return {
    establishmentLines: est,
    establishmentTotal: establishmentTotal(est),
    subscriptionLines: sub.filter((line) => line.amount > 0),
    subscriptionTotal: subscriptionTotal(sub),
    metaSpendNote: meta,
  }
}
