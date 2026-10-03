import { createToken } from "@/lib/onboarding/ids"
import {
  normalizeOfferPackages,
  normalizePublicPackageView,
  offerPackageLabels,
} from "@/lib/internal/offer-packages"
import type { Offer, OfferPackageId, OfferServiceId, OfferStatus, StoreData } from "@/lib/onboarding/types"

export const OFFER_SERVICE_IDS = [
  "meta",
  "google",
  "hjemmeside",
  "hosting",
  "webshop",
  "seo-geo",
  "lead-system",
] as const satisfies readonly OfferServiceId[]

export const OFFER_SERVICE_LABELS: Record<OfferServiceId, string> = {
  meta: "Meta ads",
  google: "Google ads",
  hjemmeside: "Hjemmeside",
  hosting: "Hosting",
  webshop: "Webshop",
  "seo-geo": "SEO & GEO",
  "lead-system": "CenHub Lead",
}

export const OFFER_FULL_GROWTH_PRESET: {
  packages: OfferPackageId[]
  services: OfferServiceId[]
  publicPackageView: "vaekst"
} = {
  packages: ["vaekstpakke"],
  services: ["hjemmeside", "lead-system", "meta"],
  publicPackageView: "vaekst",
}

export function isOfferServiceId(value: string): value is OfferServiceId {
  return (OFFER_SERVICE_IDS as readonly string[]).includes(value)
}

export function normalizeOfferServices(value: unknown): OfferServiceId[] {
  if (!Array.isArray(value)) return []
  const picked = new Set<OfferServiceId>()
  for (const item of value) {
    if (typeof item === "string" && isOfferServiceId(item)) picked.add(item)
  }
  return OFFER_SERVICE_IDS.filter((id) => picked.has(id))
}

export function offerServiceLabels(services: OfferServiceId[]) {
  return services.map((id) => OFFER_SERVICE_LABELS[id]).join(", ")
}

export function createOfferSlug(data: StoreData, companyName: string) {
  const base = companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  const suffix = createToken().slice(0, 10)
  const candidate = `${base || "tilbud"}-${suffix}`
  const taken = new Set((data.offers ?? []).map((item) => item.slug))
  if (!taken.has(candidate)) return candidate
  return `${candidate}-${createToken().slice(0, 6)}`
}

function normalizeOfferStatus(value: unknown): OfferStatus {
  if (value === "accepted") return "accepted"
  if (value === "sent") return "sent"
  return "draft"
}

function normalizeAcceptedVia(value: unknown): Offer["acceptedVia"] {
  if (value === "admin" || value === "customer") return value
  return null
}

export function normalizeOffer(offer: Offer): Offer {
  const status = normalizeOfferStatus(offer.status)
  const packages = normalizeOfferPackages(offer.packages)
  const sentAt =
    status === "draft" ? null : typeof offer.sentAt === "string" ? offer.sentAt : null
  const acceptedAt =
    status === "accepted" && typeof offer.acceptedAt === "string" ? offer.acceptedAt : null
  return {
    id: offer.id,
    slug:
      typeof offer.slug === "string" && offer.slug.trim()
        ? offer.slug.trim()
        : offer.id.replace(/^offer_/, "tilbud-"),
    status,
    workspaceId: offer.workspaceId || null,
    companyName: offer.companyName ?? "",
    contactName: offer.contactName ?? "",
    email: offer.email ?? "",
    phone: String(offer.phone ?? "")
      .trim()
      .slice(0, 40),
    cvr: (offer.cvr ?? "").replace(/[^\d]/g, "").slice(0, 8),
    packages: packages.length > 0 ? packages : ["vaekstpakke"],
    publicPackageView: normalizePublicPackageView(offer.publicPackageView),
    services: normalizeOfferServices(offer.services),
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt || offer.createdAt,
    sentAt,
    acceptedAt,
    acceptedVia: status === "accepted" ? normalizeAcceptedVia(offer.acceptedVia) : null,
    signatureName:
      status === "accepted" && typeof offer.signatureName === "string"
        ? offer.signatureName.trim().slice(0, 120) || null
        : null,
  }
}

export function offerSummaryLabel(offer: Offer) {
  const parts = offerPackageLabels(offer.packages)
  const extra = offerServiceLabels(offer.services)
  return extra ? `${parts} · ${extra}` : parts
}
