import { createId, nowIso } from "@/lib/onboarding/ids"
import { getStore } from "@/lib/onboarding/store"
import type { OfferEngagement } from "@/lib/onboarding/types"

type TrackBody = {
  sessionId?: string
  type?: "open" | "pulse" | "leave"
  maxScrollPct?: number
  durationSec?: number
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const body = (await request.json()) as TrackBody
    const type = body.type ?? "pulse"
    const maxScrollPct = Math.min(100, Math.max(0, Math.round(Number(body.maxScrollPct) || 0)))
    const durationSec = Math.max(0, Math.round(Number(body.durationSec) || 0))

    const result = await getStore().update((data) => {
      const offer = (data.offers ?? []).find((item) => item.slug === slug)
      if (!offer) throw new Error("Tilbuddet findes ikke.")
      data.offerEngagement = data.offerEngagement ?? []

      if (type === "open" || !body.sessionId) {
        const session: OfferEngagement = {
          id: createId("oes"),
          offerId: offer.id,
          slug,
          startedAt: nowIso(),
          endedAt: null,
          opened: true,
          maxScrollPct,
          durationSec,
        }
        data.offerEngagement.push(session)
        return { sessionId: session.id }
      }

      const session = data.offerEngagement.find((item) => item.id === body.sessionId)
      if (!session) throw new Error("Session findes ikke.")
      session.maxScrollPct = Math.max(session.maxScrollPct, maxScrollPct)
      session.durationSec = Math.max(session.durationSec, durationSec)
      if (type === "leave") session.endedAt = nowIso()
      return { sessionId: session.id }
    })

    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tracking fejlede."
    return Response.json({ error: message }, { status: 400 })
  }
}
