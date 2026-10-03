import type { OfferModuleId } from "@/lib/internal/offer-modules"

const BASE = "https://censio.dk/wp-content/uploads"

/** Kuraterede billeder fra censio.dk til tilbudssiden */
export const CENSIO_OFFER_MEDIA = {
  hero: {
    src: `${BASE}/2025/11/5.jpg`,
    alt: "Censio, digital vækst for ambitiøse virksomheder",
  },
  framework: {
    src: `${BASE}/2026/02/2-4.png`,
    alt: "Marketing framework, strategi, content og performance",
  },
  founder: {
    src: "/kaj-eli-joensen.jpg",
    alt: "Kaj Eli Joensen, CEO & Founder af Censio",
  },
  caseHandvaerk: {
    src: `${BASE}/2026/02/ML.jpg`,
    alt: "Case, vækst i håndværksbranchen",
  },
  performance: {
    src: `${BASE}/2026/02/Screenshot-2026-02-13-at-16.49.15.png`,
    alt: "Performance marketing resultater",
  },
} as const

export const MODULE_MEDIA: Record<OfferModuleId, { src: string; alt: string }> = {
  onboarding: {
    src: `${BASE}/2026/02/3-3.png`,
    alt: "Onboarding og analyse hos Censio",
  },
  strategy: {
    src: CENSIO_OFFER_MEDIA.framework.src,
    alt: CENSIO_OFFER_MEDIA.framework.alt,
  },
  website: {
    src: `${BASE}/2026/02/8.png`,
    alt: "Konverteringsoptimeret hjemmeside",
  },
  tracking: {
    src: `${BASE}/2026/02/9.6.png`,
    alt: "Tracking og måling af marketing",
  },
  video: {
    src: `${BASE}/2026/02/7-1.png`,
    alt: "Video marketing der skaber salg",
  },
  "lead-system": {
    src: `${BASE}/2026/02/Screenshot-2026-02-09-at-23.39.27.png`,
    alt: "CenHub Lead, overblik over leads og performance",
  },
}
