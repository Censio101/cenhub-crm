import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  createEmptyTemplate,
  listLeadSheetTemplates,
} from "@/lib/db/lead-sheet-repository"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    await requireCensioAdmin()
    const url = new URL(request.url)
    const categoryId =
      url.searchParams.get("categoryId") ?? url.searchParams.get("subcategoryId") ?? undefined
    const sharedOnly = url.searchParams.get("sharedOnly") === "1"
    const organizationId = url.searchParams.get("organizationId")

    const supabase = createAdminClient()
    const templates = await listLeadSheetTemplates(supabase, {
      categoryId,
      sharedOnly,
      organizationId: organizationId === "null" ? null : organizationId ?? undefined,
      withClientCounts: true,
    })
    return NextResponse.json({ templates })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireCensioAdmin()
    const body = (await request.json()) as {
      name?: string
      description?: string
      isShared?: boolean
      organizationId?: string | null
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const created = await createEmptyTemplate(supabase, {
      name: body.name.trim(),
      description: body.description,
      isShared: body.isShared,
      organizationId: body.organizationId,
    })
    return NextResponse.json(created)
  } catch (error) {
    return adminErrorResponse(error)
  }
}
