import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import {
  getOrganizationCategoryIds,
  getOrganizationSubcategoryIds,
  setOrganizationCategoryIds,
  setOrganizationIndustries,
  setOrganizationSubcategoryIds,
} from "@/lib/db/lead-sheet-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const supabase = createAdminClient()
    const org = await getOrganizationBySlug(supabase, slug)
    if (!org) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const [categoryIds, subcategoryIds] = await Promise.all([
      getOrganizationCategoryIds(supabase, org.id),
      getOrganizationSubcategoryIds(supabase, org.id),
    ])

    return NextResponse.json({
      organizationId: org.id,
      categoryIds,
      subcategoryIds,
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json()) as {
      categoryIds?: string[]
      subcategoryIds?: string[]
    }

    if (body.categoryIds === undefined && body.subcategoryIds === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const org = await getOrganizationBySlug(supabase, slug)
    if (!org) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (body.categoryIds !== undefined && body.subcategoryIds !== undefined) {
      await setOrganizationIndustries(
        supabase,
        org.id,
        body.categoryIds,
        body.subcategoryIds
      )
    } else if (body.categoryIds !== undefined) {
      await setOrganizationCategoryIds(supabase, org.id, body.categoryIds)
    } else if (body.subcategoryIds !== undefined) {
      await setOrganizationSubcategoryIds(supabase, org.id, body.subcategoryIds)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
