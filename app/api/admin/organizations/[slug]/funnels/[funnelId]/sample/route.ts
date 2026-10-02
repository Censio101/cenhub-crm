import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { serializeSample } from "@/lib/db/funnel-dto"
import {
  clearFunnelSample,
  getLeadFunnelById,
  startFunnelSampleListening,
  stopFunnelSampleListening,
} from "@/lib/db/lead-funnels-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = {
  params: Promise<{ slug: string; funnelId: string }>
}

async function loadFunnel(context: RouteContext) {
  const { slug, funnelId } = await context.params
  const admin = createAdminClient()
  const organization = await getOrganizationBySlug(admin, slug)
  if (!organization) {
    return { error: NextResponse.json({ error: "Organization not found" }, { status: 404 }) }
  }
  const funnel = await getLeadFunnelById(admin, funnelId)
  if (!funnel || funnel.organization_id !== organization.id) {
    return { error: NextResponse.json({ error: "Funnel not found" }, { status: 404 }) }
  }
  return { admin, organization, funnel }
}

/** Current sample state; the Funnels page polls this while a webhook is listening. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const loaded = await loadFunnel(context)
    if (loaded.error) return loaded.error
    return NextResponse.json(serializeSample(loaded.funnel))
  } catch (error) {
    return adminErrorResponse(error)
  }
}

/** `listen` waits for one request to use as a sample, `stop` cancels, `clear` forgets it. */
export async function POST(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const body = (await request.json().catch(() => ({}))) as { action?: string }
    const loaded = await loadFunnel(context)
    if (loaded.error) return loaded.error
    const { admin, organization, funnel } = loaded

    switch (body.action) {
      case "listen": {
        if (!funnel.enabled) {
          return NextResponse.json(
            { error: "Enable the webhook before capturing" },
            { status: 400 }
          )
        }
        const updated = await startFunnelSampleListening(admin, funnel.id, organization.id)
        return NextResponse.json(serializeSample(updated))
      }
      case "stop": {
        const updated = await stopFunnelSampleListening(admin, funnel.id, organization.id)
        return NextResponse.json(serializeSample(updated))
      }
      case "clear": {
        const updated = await clearFunnelSample(admin, funnel.id, organization.id)
        return NextResponse.json(serializeSample(updated))
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    return adminErrorResponse(error)
  }
}
