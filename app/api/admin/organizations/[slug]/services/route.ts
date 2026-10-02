import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import {
  ServiceInUseError,
  getOrganizationServicesView,
  normalizeServiceName,
  saveOrganizationServices,
} from "@/lib/db/services-repository"
import { isUuid, parseUuidList } from "@/lib/services/types"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ slug: string }> }

const MANUAL_MAX = 50
const ORDER_MAX = 600

/** The selection in display order: service ids, or `new:<name>` for manual services to create. */
function parseOrder(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > ORDER_MAX) return null
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== "string") return null
    if (item.startsWith("new:")) {
      const name = normalizeServiceName(item.slice(4))
      if (!name) return null
      out.push(`new:${name}`)
    } else if (isUuid(item)) {
      out.push(item)
    } else {
      return null
    }
  }
  return [...new Set(out)]
}

export async function GET(_request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const supabase = createAdminClient()
    const org = await getOrganizationBySlug(supabase, slug)
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json(await getOrganizationServicesView(supabase, org.id))
  } catch (error) {
    return adminErrorResponse(error)
  }
}

/**
 * Saves the client's services: `selectedIds` (full selection), `newManual` (names of manual
 * services to create for this client, selected right away) and `removedManualIds`.
 */
export async function PUT(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json().catch(() => ({}))) as {
      selectedIds?: unknown
      newManual?: unknown
      removedManualIds?: unknown
      categoryIds?: unknown
      order?: unknown
      customOrder?: unknown
    }
    const order = body.order === undefined ? undefined : parseOrder(body.order)
    const selectedIds =
      order === undefined
        ? parseUuidList(body.selectedIds)
        : order && order.filter((token) => isUuid(token))
    const removedManualIds = parseUuidList(body.removedManualIds ?? [])
    const categoryIds = body.categoryIds === undefined ? undefined : parseUuidList(body.categoryIds)
    const newManual =
      order !== undefined
        ? order && [...new Set(order.filter((t) => t.startsWith("new:")).map((t) => t.slice(4)))]
        : Array.isArray(body.newManual)
          ? [...new Set(body.newManual.map(normalizeServiceName).filter(Boolean))]
          : body.newManual === undefined
            ? []
            : null
    if (
      !selectedIds ||
      !removedManualIds ||
      !newManual ||
      newManual.length > MANUAL_MAX ||
      categoryIds === null
    ) {
      return NextResponse.json({ error: "Invalid services" }, { status: 400 })
    }
    const supabase = createAdminClient()
    const org = await getOrganizationBySlug(supabase, slug)
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await saveOrganizationServices(supabase, org.id, {
      selectedIds,
      newManual,
      removedManualIds,
      categoryIds,
      order: order ?? undefined,
      customOrder: typeof body.customOrder === "boolean" ? body.customOrder : undefined,
    })
    return NextResponse.json(await getOrganizationServicesView(supabase, org.id))
  } catch (error) {
    if (error instanceof ServiceInUseError) {
      return NextResponse.json(
        { error: "Service is used by leads", code: "in_use", serviceIds: error.serviceIds },
        { status: 409 }
      )
    }
    return adminErrorResponse(error)
  }
}
