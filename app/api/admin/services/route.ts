import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  createService,
  listCatalogWithCategories,
  normalizeServiceName,
} from "@/lib/db/services-repository"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    await requireCensioAdmin()
    const supabase = createAdminClient()
    return NextResponse.json(await listCatalogWithCategories(supabase))
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireCensioAdmin()
    const body = (await request.json().catch(() => ({}))) as { nameDa?: unknown; nameEn?: unknown }
    const nameDa = normalizeServiceName(body.nameDa)
    if (!nameDa) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }
    const supabase = createAdminClient()
    const service = await createService(supabase, {
      nameDa,
      nameEn: normalizeServiceName(body.nameEn),
    })
    return NextResponse.json({ service }, { status: 201 })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
