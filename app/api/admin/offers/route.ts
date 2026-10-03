import { enrichOfferPhone } from "@/lib/internal/offer-admin"
import { summarizeOfferEngagement } from "@/lib/internal/offer-engagement"
import { normalizeOfferPackages, offerPackageLabels } from "@/lib/internal/offer-packages"
import { resolveOfferRecipient } from "@/lib/internal/offer-recipient"
import {
  createOfferSlug,
  normalizeOfferServices,
  offerSummaryLabel,
} from "@/lib/internal/offers"
import { pushAudit } from "@/lib/onboarding/audit"
import { jsonError, requireCensioAdmin } from "@/lib/onboarding/auth"
import { createId, nowIso } from "@/lib/onboarding/ids"
import { getStore } from "@/lib/onboarding/store"
import { normalizePublicPackageView } from "@/lib/internal/offer-packages"
import type { Offer } from "@/lib/onboarding/types"

type OfferBody = {
  workspaceId?: string | null
  companyName?: string
  contactName?: string
  email?: string
  phone?: string
  cvr?: string
  packages?: unknown
  publicPackageView?: unknown
  services?: unknown
}

function packagesFrom(body: OfferBody) {
  const packages = normalizeOfferPackages(body.packages)
  if (packages.length === 0) throw new Error("Vælg mindst én marketingpakke.")
  return packages
}

export async function GET() {
  try {
    await requireCensioAdmin()
    const data = await getStore().read()
    const offers = [...(data.offers ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const engagement = data.offerEngagement ?? []
    const contacts = data.customerContacts ?? []
    return Response.json({
      offers: offers.map((offer) => {
        const enriched = enrichOfferPhone(offer, contacts)
        return {
          ...enriched,
          summary: offerSummaryLabel(enriched),
          engagement: summarizeOfferEngagement(engagement, offer.id),
        }
      }),
    })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireCensioAdmin()
    const body = (await request.json()) as OfferBody
    const saved = await getStore().update((data) => {
      const who = resolveOfferRecipient(data, body)
      const packages = packagesFrom(body)
      const services = normalizeOfferServices(body.services)
      const publicPackageView = normalizePublicPackageView(body.publicPackageView)
      const now = nowIso()
      const offer: Offer = {
        id: createId("offer"),
        slug: createOfferSlug(data, who.companyName),
        status: "draft",
        ...who,
        packages,
        publicPackageView,
        services,
        createdAt: now,
        updatedAt: now,
        sentAt: null,
        acceptedAt: null,
        acceptedVia: null,
        signatureName: null,
      }
      data.offers = [...(data.offers ?? []), offer]
      pushAudit(data, actor, {
        action: "Tilbud",
        target: offer.companyName,
        change: `Oprettede udkast til ${offer.companyName}. Pakker: ${offerPackageLabels(packages)}.`,
      })
      return offer
    })
    return Response.json({ offer: saved })
  } catch (error) {
    return jsonError(error)
  }
}
