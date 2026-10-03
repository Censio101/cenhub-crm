import { summarizeOfferEngagement } from "@/lib/internal/offer-engagement"
import {
  normalizeOfferPackages,
  normalizePublicPackageView,
  offerPackageLabels,
} from "@/lib/internal/offer-packages"
import { resolveOfferRecipient } from "@/lib/internal/offer-recipient"
import { normalizeOfferServices, offerServiceLabels, offerSummaryLabel } from "@/lib/internal/offers"
import { pushAudit } from "@/lib/onboarding/audit"
import { appUrl, jsonError, requireCensioAdmin } from "@/lib/onboarding/auth"
import { nowIso } from "@/lib/onboarding/ids"
import { getStore } from "@/lib/onboarding/store"
import type { Offer } from "@/lib/onboarding/types"

type OfferBody = {
  status?: string
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

function describeEdit(before: Offer, after: Offer) {
  const parts: string[] = []
  if (before.companyName !== after.companyName) {
    parts.push(`Virksomhed: ${before.companyName} → ${after.companyName}`)
  }
  if (before.contactName !== after.contactName) {
    parts.push(`Navn: ${before.contactName || ","} → ${after.contactName || ","}`)
  }
  if (before.email !== after.email) parts.push(`E-mail: ${before.email} → ${after.email}`)
  if (before.phone !== after.phone) parts.push(`Telefon: ${before.phone || ","} → ${after.phone || ","}`)
  if (before.cvr !== after.cvr) parts.push(`CVR: ${before.cvr || ","} → ${after.cvr || ","}`)
  const previous = offerPackageLabels(before.packages)
  const next = offerPackageLabels(after.packages)
  if (previous !== next) parts.push(`Pakker: ${previous} → ${next}`)
  if (before.publicPackageView !== after.publicPackageView) {
    parts.push(`Kunde ser: ${before.publicPackageView} → ${after.publicPackageView}`)
  }
  const prevServices = offerServiceLabels(before.services)
  const nextServices = offerServiceLabels(after.services)
  if (prevServices !== nextServices) parts.push(`Tillæg: ${prevServices || ","} → ${nextServices || ","}`)
  return parts.join(". ")
}

function isStatusOnlyPatch(body: OfferBody) {
  const keys = Object.keys(body).filter((key) => body[key as keyof OfferBody] !== undefined)
  return keys.length === 1 && keys[0] === "status"
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireCensioAdmin()
    const { id } = await context.params
    const body = (await request.json()) as OfferBody
    const saved = await getStore().update((data) => {
      const offer = (data.offers ?? []).find((item) => item.id === id)
      if (!offer) throw new Error("Tilbuddet findes ikke.")

      if (offer.status === "accepted") {
        throw new Error("Et accepteret tilbud kan ikke ændres.")
      }

      if (body.status === "accepted") {
        if (offer.status !== "sent") {
          throw new Error("Kun sendte tilbud kan markeres som accepteret.")
        }
        const now = nowIso()
        offer.status = "accepted"
        offer.acceptedAt = now
        offer.acceptedVia = "admin"
        offer.updatedAt = now
        pushAudit(data, actor, {
          action: "Tilbud",
          target: offer.companyName,
          change: `Markerede tilbuddet til ${offer.companyName} som accepteret (Censio).`,
        })
        return offer
      }

      if (body.status === "sent") {
        if (offer.status !== "draft") {
          throw new Error("Kun udkast kan markeres som sendt.")
        }
        offer.status = "sent"
        offer.sentAt = nowIso()
        offer.updatedAt = offer.sentAt
        const link = `${appUrl(request)}/tilbud/${offer.slug}`
        pushAudit(data, actor, {
          action: "Tilbud",
          target: offer.companyName,
          change: `Markerede tilbuddet til ${offer.companyName} som sendt. Link: ${link}`,
        })
        return offer
      }

      if (offer.status !== "draft") {
        throw new Error("Kun udkast kan rettes.")
      }

      if (isStatusOnlyPatch(body)) {
        throw new Error("Ugyldig statusændring.")
      }

      const who = resolveOfferRecipient(data, body)
      const packages = normalizeOfferPackages(body.packages)
      if (packages.length === 0) throw new Error("Vælg mindst én marketingpakke.")
      const services = normalizeOfferServices(body.services)
      const publicPackageView = normalizePublicPackageView(body.publicPackageView)
      const before = { ...offer, packages: [...offer.packages], services: [...offer.services] }
      offer.workspaceId = who.workspaceId
      offer.companyName = who.companyName
      offer.contactName = who.contactName
      offer.email = who.email
      offer.phone = who.phone
      offer.cvr = who.cvr
      offer.packages = packages
      offer.publicPackageView = publicPackageView
      offer.services = services
      offer.updatedAt = nowIso()
      const change = describeEdit(before, offer)
      if (change) {
        pushAudit(data, actor, { action: "Tilbud", target: offer.companyName, change })
      }
      return offer
    })
    const engagement = summarizeOfferEngagement(
      (await getStore().read()).offerEngagement ?? [],
      saved.id
    )
    return Response.json({ offer: { ...saved, summary: offerSummaryLabel(saved), engagement } })
  } catch (error) {
    return jsonError(error)
  }
}
