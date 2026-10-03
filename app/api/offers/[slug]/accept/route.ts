import { pushAudit } from "@/lib/onboarding/audit"
import { jsonError } from "@/lib/onboarding/auth"
import { nowIso } from "@/lib/onboarding/ids"
import { getStore } from "@/lib/onboarding/store"

type AcceptBody = {
  signatureName?: string
  termsAccepted?: boolean
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const body = (await request.json()) as AcceptBody
    const signatureName = body.signatureName?.trim().slice(0, 120) ?? ""
    if (!signatureName) {
      return Response.json({ error: "Skriv dit fulde navn som underskrift." }, { status: 400 })
    }
    if (!body.termsAccepted) {
      return Response.json({ error: "Du skal acceptere vilkårene." }, { status: 400 })
    }

    const saved = await getStore().update((data) => {
      const offer = (data.offers ?? []).find((item) => item.slug === slug)
      if (!offer) throw new Error("Tilbuddet findes ikke.")
      if (offer.status === "accepted") return offer
      if (offer.status !== "sent") {
        throw new Error("Tilbuddet kan kun accepteres, når det er sendt.")
      }
      const now = nowIso()
      offer.status = "accepted"
      offer.acceptedAt = now
      offer.acceptedVia = "customer"
      offer.signatureName = signatureName
      offer.updatedAt = now
      pushAudit(data, { id: "offer-customer", name: signatureName }, {
        action: "Tilbud",
        target: offer.companyName,
        change: `${signatureName} accepterede tilbuddet til ${offer.companyName} digitalt.`,
      })
      return offer
    })

    return Response.json({
      offer: {
        slug: saved.slug,
        status: saved.status,
        acceptedAt: saved.acceptedAt,
        signatureName: saved.signatureName,
      },
    })
  } catch (error) {
    return jsonError(error)
  }
}
