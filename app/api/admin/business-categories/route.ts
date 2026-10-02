import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  createBusinessCategory,
  createBusinessSubcategoriesFromNames,
  listBusinessCategories,
} from "@/lib/db/business-categories-repository"
import { normalizeBusinessCategoryName } from "@/lib/lead-sheet/business-category-label"
import { slugifyIndustryName, uniqueSlug } from "@/lib/lead-sheet/slug-from-name"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    await requireCensioAdmin()
    const supabase = createAdminClient()
    const categories = await listBusinessCategories(supabase)
    return NextResponse.json({ categories })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireCensioAdmin()
    const body = (await request.json()) as {
      slug?: string
      name?: string
      nameDa?: string
      nameEn?: string
      sortIndex?: number
      subcategories?: unknown
    }

    const name = normalizeBusinessCategoryName(
      body.name ?? body.nameDa ?? body.nameEn ?? ""
    )
    if (!name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const existing = await listBusinessCategories(supabase)
    const taken = new Set(existing.map((c) => c.slug))
    const preferred = body.slug?.trim()
      ? slugifyIndustryName(body.slug)
      : slugifyIndustryName(name)
    const slug = uniqueSlug(preferred, (candidate) => taken.has(candidate))

    const category = await createBusinessCategory(supabase, {
      slug,
      nameDa: name,
      nameEn: name,
      sortIndex: body.sortIndex,
    })

    const subNames = Array.isArray(body.subcategories)
      ? body.subcategories.filter((item): item is string => typeof item === "string")
      : []

    if (subNames.length > 0) {
      const subcategories = await createBusinessSubcategoriesFromNames(
        supabase,
        category.id,
        [],
        subNames
      )
      return NextResponse.json({ category: { ...category, subcategories } })
    }

    return NextResponse.json({ category })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
