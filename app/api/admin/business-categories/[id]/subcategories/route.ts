import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  createBusinessSubcategory,
  listBusinessCategories,
} from "@/lib/db/business-categories-repository"
import { normalizeBusinessCategoryName } from "@/lib/lead-sheet/business-category-label"
import { slugifyIndustryName, uniqueSlug } from "@/lib/lead-sheet/slug-from-name"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { id: categoryId } = await context.params
    const body = (await request.json()) as {
      slug?: string
      name?: string
      nameDa?: string
      nameEn?: string
      sortIndex?: number
    }

    const name = normalizeBusinessCategoryName(
      body.name ?? body.nameDa ?? body.nameEn ?? ""
    )
    if (!name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const categories = await listBusinessCategories(supabase)
    const category = categories.find((c) => c.id === categoryId)
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }
    const taken = new Set(category.subcategories.map((s) => s.slug))
    const preferred = body.slug?.trim()
      ? slugifyIndustryName(body.slug)
      : slugifyIndustryName(name)
    const slug = uniqueSlug(preferred, (candidate) => taken.has(candidate))

    const subcategory = await createBusinessSubcategory(supabase, {
      categoryId,
      slug,
      nameDa: name,
      nameEn: name,
      sortIndex: body.sortIndex,
    })
    return NextResponse.json({ subcategory })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
