import type { OfferPackageTagId } from "@/lib/internal/offer-package-tags"
import type { OfferPackageId, OfferPublicPackageView } from "@/lib/onboarding/types"

export type { OfferPackageId, OfferPublicPackageView }

export type OfferPackage = {
  id: OfferPackageId
  name: string
  /** Etablering / opstart (ekskl. moms) */
  price: number
  /** Løbende marketing-retainer pr. md. */
  monthlyRetainer?: number
  monthlyRetainerLabel?: string
  /** Vist som forventet annoncespend (betales til Meta) */
  expectedAdSpend?: string
  recommended?: boolean
  tags: OfferPackageTagId[]
  includes: string[]
}

/** Eneste salgsbare pakke indtil de øvrige er klar igen */
export const DEFAULT_OFFER_PACKAGE_ID = "vaekstpakke" satisfies OfferPackageId

const LEGACY_PACKAGE_IDS = ["basisk-marketing", "marketing-fundament"] as const

export const OFFER_PACKAGES: OfferPackage[] = [
  {
    id: "vaekstpakke",
    name: "Vækstpakke med video",
    price: 21_000,
    monthlyRetainer: 5_000,
    monthlyRetainerLabel: "Marketing retainer",
    expectedAdSpend: "5.000–10.000 kr",
    recommended: true,
    tags: ["marketing", "meta", "video", "tracking"],
    includes: [
      "Kreativer",
      "Statisk",
      "Video pakke",
      "Strategi",
      "Onboarding 3.500 kr",
      "Server-side tracking",
    ],
  },
]

export const OFFER_PACKAGE_IDS = OFFER_PACKAGES.map((item) => item.id)

export function isOfferPackageId(value: string): value is OfferPackageId {
  return (OFFER_PACKAGE_IDS as readonly string[]).includes(value)
}

function toCatalogPackageId(value: string): OfferPackageId | null {
  if (isOfferPackageId(value)) return value
  if ((LEGACY_PACKAGE_IDS as readonly string[]).includes(value)) return DEFAULT_OFFER_PACKAGE_ID
  return null
}

export function normalizeOfferPackages(value: unknown): OfferPackageId[] {
  if (!Array.isArray(value)) return [DEFAULT_OFFER_PACKAGE_ID]
  const result: OfferPackageId[] = []
  for (const item of value) {
    if (typeof item !== "string") continue
    const id = toCatalogPackageId(item)
    if (id && !result.includes(id)) result.push(id)
  }
  return result.length > 0 ? result : [DEFAULT_OFFER_PACKAGE_ID]
}

export function packageById(id: OfferPackageId): OfferPackage {
  return OFFER_PACKAGES.find((item) => item.id === id) ?? OFFER_PACKAGES[0]!
}

export function offerPackageLabels(ids: OfferPackageId[]) {
  return normalizeOfferPackages(ids).map((id) => packageById(id).name).join(", ")
}

export function normalizePublicPackageView(value: unknown): OfferPublicPackageView {
  if (value === "vaekst" || value === "both") return value
  return "vaekst"
}

export function visiblePackages(
  selected: OfferPackageId[],
  view: OfferPublicPackageView
): OfferPackageId[] {
  const ids = normalizeOfferPackages(selected)
  if (view === "both") return ids
  return ids.length > 0 ? [ids[0]] : [DEFAULT_OFFER_PACKAGE_ID]
}

export function defaultPublicPackageView(_packages: OfferPackageId[]): OfferPublicPackageView {
  return "vaekst"
}

export function movePackageInOrder(
  packages: OfferPackageId[],
  id: OfferPackageId,
  direction: "up" | "down"
): OfferPackageId[] {
  const index = packages.indexOf(id)
  if (index < 0) return packages
  const target = direction === "up" ? index - 1 : index + 1
  if (target < 0 || target >= packages.length) return packages
  const next = packages.slice()
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}
