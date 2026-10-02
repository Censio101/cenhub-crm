import type { SupabaseClient } from "@supabase/supabase-js"

import { normalizeBusinessCategoryName } from "@/lib/lead-sheet/business-category-label"
import { slugifyIndustryName, uniqueSlug } from "@/lib/lead-sheet/slug-from-name"
import type { BusinessCategory, BusinessSubcategory } from "@/lib/lead-sheet/types"

type CategoryRow = {
  id: string
  slug: string
  name_da: string
  name_en: string
  sort_index: number
}

type SubcategoryRow = {
  id: string
  category_id: string
  slug: string
  name_da: string
  name_en: string
  sort_index: number
}

export async function listBusinessCategories(
  supabase: SupabaseClient
): Promise<BusinessCategory[]> {
  const [{ data: categories, error: cErr }, { data: subs, error: sErr }] = await Promise.all([
    supabase.from("business_categories").select("*").order("sort_index"),
    supabase.from("business_subcategories").select("*").order("sort_index"),
  ])

  if (cErr) throw cErr
  if (sErr) throw sErr

  const subsByCat = new Map<string, BusinessSubcategory[]>()
  for (const row of (subs ?? []) as SubcategoryRow[]) {
    const list = subsByCat.get(row.category_id) ?? []
    list.push({
      id: row.id,
      categoryId: row.category_id,
      slug: row.slug,
      nameDa: row.name_da,
      nameEn: row.name_en,
      sortIndex: row.sort_index,
    })
    subsByCat.set(row.category_id, list)
  }

  return ((categories ?? []) as CategoryRow[]).map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    nameDa: cat.name_da,
    nameEn: cat.name_en,
    sortIndex: cat.sort_index,
    subcategories: subsByCat.get(cat.id) ?? [],
  }))
}

export async function createBusinessCategory(
  supabase: SupabaseClient,
  input: { slug: string; nameDa: string; nameEn: string; sortIndex?: number }
): Promise<BusinessCategory> {
  const { data, error } = await supabase
    .from("business_categories")
    .insert({
      slug: input.slug,
      name_da: input.nameDa,
      name_en: input.nameEn,
      sort_index: input.sortIndex ?? 0,
    })
    .select("*")
    .single()

  if (error) throw error
  const row = data as CategoryRow
  return {
    id: row.id,
    slug: row.slug,
    nameDa: row.name_da,
    nameEn: row.name_en,
    sortIndex: row.sort_index,
    subcategories: [],
  }
}

/** Creates subcategories from display names; skips blanks and duplicates (case-insensitive). */
export async function createBusinessSubcategoriesFromNames(
  supabase: SupabaseClient,
  categoryId: string,
  existingSubcategories: readonly BusinessSubcategory[],
  rawNames: readonly string[]
): Promise<BusinessSubcategory[]> {
  const taken = new Set(existingSubcategories.map((s) => s.slug))
  const seenNames = new Set(
    existingSubcategories.map((s) => s.nameDa.trim().toLocaleLowerCase())
  )
  const created: BusinessSubcategory[] = []

  for (const raw of rawNames) {
    const name = normalizeBusinessCategoryName(raw)
    if (!name) continue
    const nameKey = name.toLocaleLowerCase()
    if (seenNames.has(nameKey)) continue
    seenNames.add(nameKey)

    const slug = uniqueSlug(slugifyIndustryName(name), (candidate) => taken.has(candidate))
    taken.add(slug)
    const subcategory = await createBusinessSubcategory(supabase, {
      categoryId,
      slug,
      nameDa: name,
      nameEn: name,
      sortIndex: existingSubcategories.length + created.length,
    })
    created.push(subcategory)
  }

  return created
}

export async function createBusinessSubcategory(
  supabase: SupabaseClient,
  input: {
    categoryId: string
    slug: string
    nameDa: string
    nameEn: string
    sortIndex?: number
  }
): Promise<BusinessSubcategory> {
  const { data, error } = await supabase
    .from("business_subcategories")
    .insert({
      category_id: input.categoryId,
      slug: input.slug,
      name_da: input.nameDa,
      name_en: input.nameEn,
      sort_index: input.sortIndex ?? 0,
    })
    .select("*")
    .single()

  if (error) throw error
  const row = data as SubcategoryRow
  return {
    id: row.id,
    categoryId: row.category_id,
    slug: row.slug,
    nameDa: row.name_da,
    nameEn: row.name_en,
    sortIndex: row.sort_index,
  }
}

export async function deleteBusinessCategory(
  supabase: SupabaseClient,
  categoryId: string
): Promise<void> {
  const { error } = await supabase.from("business_categories").delete().eq("id", categoryId)
  if (error) throw error
}

export async function deleteBusinessSubcategory(
  supabase: SupabaseClient,
  subcategoryId: string
): Promise<void> {
  const { error } = await supabase.from("business_subcategories").delete().eq("id", subcategoryId)
  if (error) throw error
}

/** Rename keeps the slug stable; new rows store the same value in da/en. */
export async function renameBusinessCategory(
  supabase: SupabaseClient,
  categoryId: string,
  name: string
): Promise<{ id: string; nameDa: string; nameEn: string } | null> {
  const { data, error } = await supabase
    .from("business_categories")
    .update({ name_da: name, name_en: name })
    .eq("id", categoryId)
    .select("id, name_da, name_en")
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return { id: data.id as string, nameDa: data.name_da as string, nameEn: data.name_en as string }
}
