import { OFFER_SERVICE_IDS } from "@/lib/internal/offers"
import { offerPackageLabels } from "@/lib/internal/offer-packages"
import type { CustomerContact, Offer, OfferServiceId } from "@/lib/onboarding/types"

export type OfferPartition = {
  drafts: Offer[]
  sent: Offer[]
  accepted: Offer[]
}

export function partitionOffers(offers: Offer[]): OfferPartition {
  const drafts: Offer[] = []
  const sent: Offer[] = []
  const accepted: Offer[] = []
  for (const offer of offers) {
    if (offer.status === "draft") drafts.push(offer)
    else if (offer.status === "accepted") accepted.push(offer)
    else if (offer.status === "sent") sent.push(offer)
  }
  return { drafts, sent, accepted }
}

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "")
}

export function offerMatchesQuery(offer: Offer, query: string) {
  const needle = query.trim().toLocaleLowerCase("da")
  if (!needle) return true
  const needleDigits = digitsOnly(needle)
  const haystack = [
    offer.contactName,
    offer.companyName,
    offer.email,
    offer.cvr,
    offer.phone,
  ]
  if (haystack.some((value) => value.toLocaleLowerCase("da").includes(needle))) return true
  if (needleDigits.length >= 4) {
    const phoneDigits = digitsOnly(offer.phone)
    const cvrDigits = digitsOnly(offer.cvr)
    if (phoneDigits.includes(needleDigits) || cvrDigits.includes(needleDigits)) return true
  }
  return false
}

export function filterOffersByQuery(offers: Offer[], query: string) {
  return offers.filter((offer) => offerMatchesQuery(offer, query))
}

export function offerContentTagIds(offer: Pick<Offer, "packages" | "services">): OfferServiceId[] {
  const picked = new Set<OfferServiceId>(offer.services)
  if (offer.packages.length > 0) picked.add("meta")
  return OFFER_SERVICE_IDS.filter((id) => picked.has(id))
}

export function offerPackageSummary(offer: Pick<Offer, "packages">) {
  return offerPackageLabels(offer.packages)
}

export function enrichOfferPhone(offer: Offer, contacts: CustomerContact[]): Offer {
  if (offer.phone.trim()) return offer
  if (!offer.workspaceId) return offer
  const contact = contacts.find((item) => item.workspaceId === offer.workspaceId)
  if (!contact?.phone) return offer
  return { ...offer, phone: contact.phone }
}

export function enrichOfferCvr(offer: Offer, contacts: CustomerContact[]): Offer {
  if (offer.cvr.replace(/\D/g, "").length >= 8) return offer
  if (!offer.workspaceId) return offer
  const contact = contacts.find((item) => item.workspaceId === offer.workspaceId)
  if (!contact?.cvr?.trim()) return offer
  return { ...offer, cvr: contact.cvr.trim() }
}

export function formatOfferCvrLabel(cvr: string): string | null {
  const trimmed = cvr.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, "")
  if (digits.length === 8) {
    return `CVR ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  }
  if (/^cvr\b/i.test(trimmed)) return trimmed
  return digits ? `CVR ${digits}` : trimmed
}

export function normalizeOfferPhone(value: unknown) {
  return String(value ?? "")
    .trim()
    .slice(0, 40)
}
