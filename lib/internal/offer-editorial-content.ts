export const EDITORIAL_DELIVERABLES = [
  {
    title: "Video pakke",
    id: "video" as const,
    text: "Vi producerer video og billeder med fokus på salg, kendskab og et stærkt brand. Materialet udvikles med en direkte rød tråd til jeres vækstplan.",
  },
  {
    title: "Tracking",
    id: "tracking" as const,
    text: "Vi opsætter kampagnerne og sikrer, at vi tracker profitabelt og skalerer efter en forbedret bundlinje frem for toplinjen.",
  },
  {
    title: "Strategi",
    id: "strategy" as const,
    text: "Vi udvikler en målrettet annoncestrategi og tilbyder løbende rådgivning for optimal synlighed, konverteringer og effektiv budgetudnyttelse.",
  },
  {
    title: "Opsætning af Meta",
    id: "meta" as const,
    text: "Vi opsætter jeres Meta Ads-kampagner og skalerer løbende med udgangspunkt i en forbedret bundlinje.",
  },
  {
    title: "Analyse af Meta-konto",
    id: "analysis" as const,
    text: "En marketinganalyse skaber grundlaget for opsætning, eksekvering og kontinuerlige performancejusteringer.",
  },
  {
    title: "Konkurrentanalyse",
    id: "competitors" as const,
    text: "Vi identificerer styrker og svagheder på markedet, så løsningerne finjusteres til en stærkere markedsposition.",
  },
  {
    title: "CenHub Lead",
    id: "lead-system" as const,
    text: "Fuldt overblik over leads, kvalitet pr. lead, close rate, topline, bundlinje, POAS, ROAS, ROI og opfølgning med Opkald 1–5.",
  },
  {
    title: "Professionel hjemmeside",
    id: "website" as const,
    text: "Konverteringsoptimeret hjemmeside med SEO-fundament, besøgende guides til henvendelse og tilbud.",
  },
] as const

/** Fase 1 på tilbudssiden, efter pakkevalg */
export const EDITORIAL_MARKET_ANALYSIS = {
  phaseLabel: "Fase 1",
  titleBeforeAccent: "Konkurrence &",
  titleAccent: "brancheanalyse",
  lead: "Skille jer ud, og overhalde dem, der tager jeres kunder i dag.",
  steps: [
    {
      id: "find-konkurrenter",
      why: "Vi skal vide, hvem der kører marketing mod jeres kunder.",
    },
    {
      id: "brancheanalyse",
      why: "Kunderne vælger ud fra branchens behov og budskaber.",
    },
    {
      id: "positionering",
      why: "I skal skille jer ud, ikke ligne alle andre.",
    },
    {
      id: "eksekvering",
      why: "Indsigten skal bruges i kampagner med det samme.",
    },
  ],
} as const

/** Marketing-proces på tilbudssiden, alle pakker */
export const EDITORIAL_MARKETING_WORK = {
  phaseLabel: "Fase 2",
  title: "Marketing vækstpartner",
  whatLabel: "Hvad vi laver",
  what:
    "Vi skaber målrettede kampagner på Meta (og Google efter behov), der når jeres målgruppe og bruger budgettet fornuftigt.",
  whyLabel: "Hvorfor",
  why:
    "Med data-drevne strategier og løbende justeringer fokuserer vi på synlighed, trafik og målbare nøgletal som ROI og LTV til CAC.",
  processTitle: "Processen",
  processIntro: "Fire trin fra onboarding til løbende optimering.",
  timelineSteps: [
    {
      title: "Onboarding",
      detail: "Opsætning af annonce konto & tracking",
    },
    {
      title: "Marketinganalyse",
      detail: "Implementer marketing analyse",
    },
    {
      title: "Opsætning & eksekvering",
      detail: "Opsæt kampagner, annoncer og juster løbende",
    },
    {
      title: "Performance justering",
      detail: "Marketing performance gennemgås flere gange ugentligt.",
    },
  ],
} as const

export const EDITORIAL_PROCESS = [
  {
    num: "01",
    title: "Onboarding",
    text: "Vi samler målsætninger, forretningsindsigt og det eksisterende marketinggrundlag.",
  },
  {
    num: "02",
    title: "Analyse",
    text: "Vi finder konkurrenter, analyserer markedet og bruger indsigterne til at skabe de rigtige idéer.",
  },
  {
    num: "03",
    title: "Opsætning & eksekvering",
    text: "Vi udvikler strategi, kreativer, tracking og kampagner med en samlet rød tråd.",
  },
  {
    num: "04",
    title: "Performance justering",
    text: "Vi overvåger, rapporterer og optimerer kontinuerligt for at forbedre afkastet.",
  },
] as const

export const EDITORIAL_VIDEO_ITEMS = [
  {
    title: "Video marketing shoot",
    text: "Vi kører ud til jeres lokation og skyder mellem 5–10 marketingvideoer med direkte rød tråd til vækstplanen.",
  },
  {
    title: "Udstyr & scripts",
    text: "Vi medbringer flere kameraer, objekter, lyd, lys og marketingscripts, og hjælper med optagelserne.",
  },
  {
    title: "Kreativer & rettigheder",
    text: "Vi redigerer og lancerer materialet i kampagnerne. Kunden ejer og har fulde rettigheder til alt skabt materiale.",
  },
] as const

/** Fase 3, konkret Meta/Paid social (PDF-tilbud) */
export const EDITORIAL_PAID_SOCIAL = {
  phaseLabel: "Fase 3",
  titleBeforeAccent: "Paid social /",
  titleAccent: "Meta ads",
  intro:
    "Gennem data-drevne strategier og kontinuerlig optimering skaber vi øget synlighed, højere trafik og forbedrede nøgletal som ROI og LTV til CAC.",
  deliverables: [
    {
      id: "strategy",
      title: "Strategi & rådgivning",
      text: "Vi udvikler en målrettet annoncestrategi og tilbyder løbende rådgivning for at sikre optimal synlighed, konverteringer og effektiv budgetudnyttelse.",
    },
    {
      id: "setup",
      title: "Opsætning og justering",
      text: "Vi opsætter jeres Ads-kampagner og sikrer, at vi tracker profitabelt og skalerer efter en forbedret bundlinje, frem for at justere efter jeres toplinje.",
    },
    {
      id: "monitoring",
      title: "Løbende overvågning og profit justering",
      text: "Vi overvåger og optimerer jeres kampagner kontinuerligt for at forbedre afkast og sikre, at budgettet bruges mest effektivt.",
    },
    {
      id: "report",
      title: "Månedlig rapport & gennemgang",
      text: "I modtager en detaljeret rapport hver måned samt en gennemgang af resultaterne med optimeringsforslag.",
    },
    {
      id: "creatives",
      title: "Annonce kreativer",
      text: "Vi udarbejder alle kreativer med udgangspunkt i marketingstrategien og benytter enten jeres egne billeder eller genererer nye.",
    },
    {
      id: "backend",
      title: "Backend kommunikation",
      text: "Få direkte adgang til os gennem vores kunde-Discord, med hurtigt prioriterede svar. Her får I hurtige og konkrete svar via jeres egen kanal med os.",
    },
  ],
} as const

/** Censio Lead (censio.dk/lead-management) */
export const EDITORIAL_CENHUB_LEAD = {
  phaseLabel: "Fase 4",
  titleBeforeAccent: "Censio",
  titleAccent: "Lead system",
  intro:
    "Udviklet til marketing, forbedre pris pr lead, pris pr lukket kunde, giver mere data til Meta",
  highlights: [
    {
      id: "pipeline",
      title: "Leads og pipeline samlet",
      text: "Alle marketing leads fra Meta, hjemmeside og telefon i ét overblik, så I altid ved, hvem der skal følges op på.",
    },
    {
      id: "qualified",
      title: "Lavere pris pr. lukket kunde",
      text: "Kvalificerede henvendelser, status og opfølgning giver flere ordrer og en lavere pris pr. kunde, I lukker.",
    },
    {
      id: "channels",
      title: "Bedre data til marketing",
      text: "Mere præcis information tilbage til Meta og jeres kanaler, så budgettet bruges dér, hvor det giver salg.",
    },
  ],
  chart: {
    title: "Gennemsnit vækst i kvalificerede leads over tid",
    baselineLabel: "Uden samlet lead system",
    cenhubLabel: "Med Censio Lead",
    multiplier: "ca. 2×",
    months: [
      "Januar",
      "Februar",
      "Marts",
      "April",
      "Maj",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "December",
    ] as const,
    /** Illustration med let sæson: forår/høst op, sommer roligere, afslutning op mod nytår */
    baselineSeries: [24, 29, 37, 45, 43, 39, 37, 43, 53, 59, 56, 62] as const,
    cenhubSeries: [24, 44, 62, 78, 74, 62, 58, 72, 92, 108, 102, 118] as const,
  },
} as const

/** Fase 5, video marketing (Vækstpakke) */
export const EDITORIAL_VIDEO_MARKETING = {
  phaseLabel: "Fase 5",
  titleBeforeAccent: "Video marketing",
  titleAccent: "pakke",
  promoVideoSrc: "/offers/promo1-v05.mp4",
  introLines: [
    "Vi udarbejder video marketing materiale der er designet til at skabe salg gennem psykologi, salgs teknikker og troværdighed.",
    "Vi udarbejder 5-10 videoer som kan klippes til 20-30 videoer efterfølgende.",
  ] as const,
  deliverables: [
    {
      id: "equipment",
      title: "Vi kører ud til dig med alt udstyr",
      text: "Vi medbringer kameraer, objekter, lyd, lys og marketingscripts til jeres lokation, klar til optagelsesdagen.",
    },
    {
      id: "shoot",
      title: "Video shoot",
      text: "Vi optager 5–10 marketingvideoer med direkte rød tråd til jeres vækstplan og jeres brand.",
    },
    {
      id: "creatives",
      title: "Udarbejde kreativer, klippe video",
      text: "Vi klipper og udarbejder kreativerne og lancerer materialet i jeres kampagner.",
    },
    {
      id: "rights",
      title: "Rettigheder",
      text: "Kunden ejer og har fulde rettigheder til alt billedmateriale, videoindhold og andre kreative materialer, der bliver skabt under samarbejdet.",
    },
  ],
} as const

export const EDITORIAL_TOTAL_PRICING = {
  title: "Priser",
  establishmentTotalLabel: "Overslag på projekt",
  subscriptionTotalLabel: "Abonnement pr. md.",
  acceptLabel: "Accepter vækstpartner samarbejde",
} as const

export const EDITORIAL_TERMS = [
  {
    title: "Igangsættelse",
    text: "Censio igangsætter projektet og samarbejdet, når betalingen for marketing, video og onboarding er modtaget. Dette sikrer, at vi kan dedikere fuldt fokus og ressourcer til at levere optimale resultater.",
  },
  {
    title: "Ansvar",
    text: "Kunden er ansvarlig for at betale for annonce spend og for at kontakte og sende tilbud til leads.",
  },
  {
    title: "Opsigelse",
    text: "Der er ingen bindingsperiode. Kunden kan opsige samarbejdet eller en service med virkning inden for den løbende måned + 30 dage. Censio forbeholder sig retten til at opsige samarbejdsaftalen med en måneds varsel.",
  },
] as const

export const EDITORIAL_HERO_IMAGE =
  "https://censio.dk/wp-content/uploads/2024/06/E8W4268-scaled.webp"

export const EDITORIAL_LOGO_WHITE =
  "https://censio.dk/wp-content/uploads/2024/06/Censio-Logo-white-1024x251.png"

export const EDITORIAL_TRUSTPILOT_URL = "https://dk.trustpilot.com/review/censio.dk"

/** Officielle Trustpilot brand assets */
export const EDITORIAL_TRUSTPILOT_STARS =
  "https://cdn.trustpilot.net/brand-assets/4.1.0/stars/stars-5.svg"

export const EDITORIAL_TRUSTPILOT_LOGO =
  "https://cdn.trustpilot.net/brand-assets/4.1.0/logo-white.svg"

/** Midlertidig CVR på tilbudssiden indtil feltet altid er udfyldt på tilbuddet */
export const EDITORIAL_OFFER_CVR_PLACEHOLDER = "21532145"

export const EDITORIAL_HERO_STATS = [
  {
    value: "Performancebureau",
    label: "Vores fokus er din vækst",
    variant: "accent" as const,
  },
  {
    value: "+60",
    label: "Profitable marketing kunder hjulpet",
    variant: "default" as const,
  },
  {
    value: "+10 år",
    label: "Arbejdet med digital vækst i +10 år",
    variant: "default" as const,
  },
  {
    value: "6 Medarbejder",
    label: "Vi er et specialiseret marketing team",
    variant: "default" as const,
  },
] as const
