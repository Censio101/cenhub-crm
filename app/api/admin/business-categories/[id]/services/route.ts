import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  addServiceToCategory,
  createService,
  isCatalogService,
  normalizeServiceName,
  removeServiceFromCategory,
} from "@/lib/db/services-repository"
import { createAdminClient } from "@/lib/supabase/admin"
import { isUuid } from "@/lib/services/types"

type Ctx = { params: Promise<{ id: string }> }

/**
 * Adds a service to the category: `{ serviceId }` reuses an existing shared service,
 * `{ nameDa, nameEn? }` creates a new one.
 */
export async function POST(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const body = (await request.json().catch(() => ({}))) as {
      serviceId?: unknown
      nameDa?: unknown
      nameEn?: unknown
    }
    const supabase = createAdminClient()

    if (body.serviceId !== undefined) {
      if (!isUuid(body.serviceId) || !(await isCatalogService(supabase, body.serviceId))) {
        return NextResponse.json({ error: "Invalid service" }, { status: 400 })
      }
      await addServiceToCategory(supabase, id, body.serviceId)
      return NextResponse.json({ ok: true })
    }

    const nameDa = normalizeServiceName(body.nameDa)
    if (!nameDa) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    const service = await createService(supabase, {
      nameDa,
      nameEn: normalizeServiceName(body.nameEn),
    })
    await addServiceToCategory(supabase, id, service.id)
    return NextResponse.json({ service }, { status: 201 })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

/** Takes `?serviceId=` out of the category; the service and client selections stay. */
export async function DELETE(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const serviceId = new URL(request.url).searchParams.get("serviceId")
    if (!isUuid(id) || !isUuid(serviceId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const supabase = createAdminClient()
    await removeServiceFromCategory(supabase, id, serviceId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
