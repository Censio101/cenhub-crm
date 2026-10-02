import type { BusinessCategory, LeadSheetTemplateSummary } from "@/lib/lead-sheet/types"

let categoriesCache: BusinessCategory[] | null = null
const templatesByFilter = new Map<string, LeadSheetTemplateSummary[]>()

export function getLeadSheetsCategoriesCache(): BusinessCategory[] | null {
  return categoriesCache
}

export function setLeadSheetsCategoriesCache(categories: BusinessCategory[]): void {
  categoriesCache = categories
}

export function patchLeadSheetsCategoriesCache(
  updater: (current: BusinessCategory[]) => BusinessCategory[]
): void {
  categoriesCache = updater(categoriesCache ?? [])
}

export function invalidateLeadSheetsCategoriesCache(): void {
  categoriesCache = null
}

export function templatesCacheKey(subcategoryId: string): string {
  return subcategoryId || "__all__"
}

export function getLeadSheetsTemplatesCache(
  subcategoryId: string
): LeadSheetTemplateSummary[] | null {
  return templatesByFilter.get(templatesCacheKey(subcategoryId)) ?? null
}

export function setLeadSheetsTemplatesCache(
  subcategoryId: string,
  templates: LeadSheetTemplateSummary[]
): void {
  templatesByFilter.set(templatesCacheKey(subcategoryId), templates)
}

export function invalidateLeadSheetsTemplatesCache(): void {
  templatesByFilter.clear()
}
