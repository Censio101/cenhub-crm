import { normalizeCommercialLine } from "@/lib/internal/commercial-billing"
import { describeLineChanges, pushAudit } from "@/lib/onboarding/audit"
import { createId } from "@/lib/onboarding/ids"
import { jsonError, requireCensioAdmin } from "@/lib/onboarding/auth"
import {
  isCommercialCadence,
  isCommercialCategory,
} from "@/lib/internal/metrics"
import { getStore } from "@/lib/onboarding/store"
import type { CommercialBillingPeriod, CommercialLine } from "@/lib/onboarding/types"

type LineInput = {
  id?: string
  category?: string
  name?: string
  amount?: number
  cadence?: string
  startsOn?: string
  endsOn?: string | null
  note?: string
  billingPeriods?: Partial<CommercialBillingPeriod>[]
}

function parseLines(body: unknown, workspaceId: string): CommercialLine[] {
  if (!body || typeof body !== "object" || !Array.isArray((body as { lines?: unknown }).lines)) {
    throw new Error("Pakkelinjer mangler.")
  }
  return (body as { lines: LineInput[] }).lines.map((line) => {
    if (!line.category || !isCommercialCategory(line.category)) {
      throw new Error("Pakketypen er ugyldig.")
    }
    if (!line.cadence || !isCommercialCadence(line.cadence)) {
      throw new Error("Pristypen er ugyldig.")
    }
    return normalizeCommercialLine(
      {
        ...line,
        workspaceId,
        category: line.category,
        cadence: line.cadence,
        amount: Math.round(Number(line.amount)),
      },
      line.id?.trim() || createId("line")
    )
  })
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const actor = await requireCensioAdmin()
    const { workspaceId } = await context.params
    const lines = parseLines(await request.json(), workspaceId)
    const store = getStore()
    const saved = await store.update((data) => {
      const workspace = data.workspaces.find((item) => item.id === workspaceId)
      if (!workspace) throw new Error("Kunden findes ikke.")
      if (workspace.useDemoData) {
        throw new Error("Demo-kunden indgår ikke i Censio Internal.")
      }
      const previous = data.commercialLines.filter((line) => line.workspaceId === workspaceId)
      data.commercialLines = [
        ...data.commercialLines.filter((line) => line.workspaceId !== workspaceId),
        ...lines,
      ]
      const change = describeLineChanges(previous, lines)
      if (change) {
        pushAudit(data, actor, { action: "Kunde", target: workspace.name, change })
      }
      return lines
    })
    return Response.json({ lines: saved })
  } catch (error) {
    return jsonError(error)
  }
}
