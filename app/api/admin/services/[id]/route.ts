import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  ServiceInUseError,
  deleteService,
  normalizeServiceName,
  updateService,
} from "@/lib/db/services-repository"
import { createAdminClient } from "@/lib/supabase/admin"
import { isUuid } from "@/lib/services/types"

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const body = (await request.json().catch(() => ({}))) as { nameDa?: unknown; nameEn?: unknown }
    const nameDa = normalizeServiceName(body.nameDa)
    if (!nameDa) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }
    const supabase = createAdminClient()
    const service = await updateService(supabase, id, {
      nameDa,
      nameEn: normalizeServiceName(body.nameEn),
    })
    if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ service })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const supabase = createAdminClient()
    await deleteService(supabase, id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ServiceInUseError) {
      return NextResponse.json(
        { error: "Service is used by leads", code: "in_use", leadCount: error.leadCount },
        { status: 409 }
      )
    }
    return adminErrorResponse(error)
  }
}
