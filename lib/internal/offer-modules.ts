import type { OfferPackageId } from "@/lib/onboarding/types"
import type { OfferServiceId } from "@/lib/onboarding/types"

export type OfferModuleId =
  | "onboarding"
  | "strategy"
  | "video"
  | "tracking"
  | "website"
  | "lead-system"

export type OfferModuleContent = {
  id: OfferModuleId
  title: string
  headline: string
  bullets: string[]
  processSteps?: string[]
  flowOrder: number
}

export const OFFER_MODULE_IDS: OfferModuleId[] = [
  "onboarding",
  "strategy",
  "website",
  "tracking",
  "video",
  "lead-system",
]

export const OFFER_MODULES: OfferModuleContent[] = [
  {
    id: "onboarding",
    title: "Onboarding",
    headline: "Klar start uden gætteri",
    bullets: [
      "Markeds- og konkurrentstatus før vi går i gang",
      "Prioriteret plan: hvad vi gør først, derefter og senere",
      "Konkret uge 1–4: onboarding, analyse, opsætning, go-live",
    ],
    processSteps: ["Kickoff", "Analyse", "Plan", "Go-live"],
    flowOrder: 1,
  },
  {
    id: "strategy",
    title: "Strategi",
    headline: "Én plan, ikke spredte kanaler",
    bullets: [
      "Målgruppe, budskaber og kanalvalg i én strategi",
      "Kreativ retning der matcher jeres marked",
      "Data-drevne beslutninger frem for mavefornemmelser",
    ],
    processSteps: ["Markedsanalyse", "Positionering", "Kanalplan", "Eksekvering"],
    flowOrder: 2,
  },
  {
    id: "website",
    title: "Hjemmeside",
    headline: "Besøgende bliver til henvendelser",
    bullets: [
      "Konverteringsoptimeret design på mobil, tablet og PC",
      "SEO-fundament og hurtig performance",
      "Kunderejse der guider mod kontakt og tilbud",
    ],
    processSteps: ["Design", "Udvikling", "SEO", "Lancering"],
    flowOrder: 3,
  },
  {
    id: "tracking",
    title: "Tracking",
    headline: "I ved hvad der virker",
    bullets: [
      "Server-side tracking og events sat korrekt op",
      "Grundlag for ROAS, POAS og ROI, ikke gætværk",
      "Løbende justering når data viser muligheder",
    ],
    flowOrder: 4,
  },
  {
    id: "video",
    title: "Video pakke",
    headline: "Content der sælger, ikke bare views",
    bullets: [
      "5–10 marketingvideoer med scripts og produktion",
      "Materiale implementeret direkte i jeres annoncer",
      "Fuld rettighed til alt indhold I får leveret",
    ],
    processSteps: ["Koncept", "Optagelse", "Redigering", "Lancering i ads"],
    flowOrder: 5,
  },
  {
    id: "lead-system",
    title: "CenHub Lead",
    headline: "Fuldt overblik fra lead til bundlinje",
    bullets: [
      "Leads samlet med kvalitet pr. lead og close rate",
      "Topline, bundlinje, POAS, ROAS og ROI i ét overblik",
      "Opfølgning med Opkald 1–5, ingen leads der falder mellem to stole",
    ],
    flowOrder: 6,
  },
]

export const OFFER_FLOW_STEPS = [
  { label: "Strategi & analyse", moduleId: "strategy" as const },
  { label: "Hjemmeside", moduleId: "website" as const },
  { label: "Tracking", moduleId: "tracking" as const },
  { label: "Video & content", moduleId: "video" as const },
  { label: "Meta & annoncering", moduleId: "onboarding" as const },
  { label: "Leads i CenHub", moduleId: "lead-system" as const },
]

export const OFFER_CASES = [
  {
    title: "Danbatt",
    result: "+500 kundehenvendelser på under 6 måneder",
    tags: ["Marketing", "Meta ads"],
  },
  {
    title: "Tagdækker",
    result: "Fra 1 til 8 medarbejdere, multi-million omsætning",
    tags: ["Hjemmeside", "Marketing"],
  },
] as const

export const OFFER_COMPARISON = {
  others: [
    "Byder på alt, uanset om de kan skabe vækst",
    "Du taler med en sælger, ikke en specialist",
    "Lange bindingsperioder uanset resultater",
    "Isolerede indsatser uden samlet strategi",
  ],
  censio: [
    "Vi byder kun på cases vi kan løse profitabelt",
    "Fast marketing specialist, direkte kontakt",
    "Ingen binding, vi holder dig med resultater",
    "Marketing, content og strategi i én plan",
  ],
} as const

export const LEAD_SYSTEM_ESTABLISHMENT = 0
export const LEAD_SYSTEM_MONTHLY = 0

export function resolveOfferModules(options: {
  packages: OfferPackageId[]
  services: OfferServiceId[]
}): OfferModuleId[] {
  const modules = new Set<OfferModuleId>(["onboarding", "strategy", "tracking", "video"])

  if (options.services.includes("hjemmeside")) {
    modules.add("website")
  }

  if (options.services.includes("lead-system")) {
    modules.add("lead-system")
  }

  return OFFER_MODULE_IDS.filter((id) => modules.has(id))
}

export function modulesForDisplay(moduleIds: OfferModuleId[], visiblePackageIds: OfferPackageId[]) {
  const hasVaekst = visiblePackageIds.includes("vaekstpakke")
  return moduleIds.filter((id) => {
    if (id === "video" && !hasVaekst) return false
    return true
  })
}

export function moduleById(id: OfferModuleId) {
  return OFFER_MODULES.find((m) => m.id === id)!
}

export function sortedModules(ids: OfferModuleId[]) {
  return ids
    .map((id) => moduleById(id))
    .sort((a, b) => a.flowOrder - b.flowOrder)
}
