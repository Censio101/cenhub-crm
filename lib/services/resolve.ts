import type { ClientService, Service } from "@/lib/services/types"

export type CategoryRef = { id: string; nameDa: string; nameEn: string }
export type CategoryServiceLink = { categoryId: string; serviceId: string }

/**
 * Services a client offers: exactly the ones selected for it (opt-in), in the order the admin arranged them. Categories never add
 * services by themselves; they only tell the admin which services to suggest. `source` and
 * `categoryNames` say whether a selected service belongs to one of the client's category sets.
 * Pure so it can be tested without a database.
 */
export function resolveServices(input: {
  library: readonly Service[]
  assignedCategories: readonly CategoryRef[]
  links: readonly CategoryServiceLink[]
  selectedIds: readonly string[]
  /** Ids of services that belong to this client only. */
  manualIds?: readonly string[]
  /** true = keep `selectedIds` order as arranged; false = default order (see below). */
  customOrder?: boolean
}): ClientService[] {
  const categoryById = new Map(input.assignedCategories.map((category) => [category.id, category]))

  const categoriesOf = new Map<string, { da: string; en: string }[]>()
  for (const link of input.links) {
    const category = categoryById.get(link.categoryId)
    if (!category) continue
    const list = categoriesOf.get(link.serviceId) ?? []
    list.push({ da: category.nameDa, en: category.nameEn })
    categoriesOf.set(link.serviceId, list)
  }

  const byId = new Map(input.library.map((service) => [service.id, service]))
  const selected: Service[] = []
  for (const id of input.selectedIds) {
    const service = byId.get(id)
    if (service) selected.push(service)
  }

  const manual = new Set(input.manualIds ?? [])
  const ordered = input.customOrder
    ? selected
    : sortByDefaultRank(selected, (service) =>
        defaultRank(
          manual.has(service.id) ? "manual" : categoriesOf.has(service.id) ? "mine" : "other"
        )
      )

  return ordered.map((service) => {
    const fromCategories = categoriesOf.get(service.id) ?? []
    return {
      id: service.slug,
      nameDa: service.nameDa,
      nameEn: service.nameEn,
      source: fromCategories.length > 0 ? "category" : "manual",
      categoryNames: fromCategories,
    }
  })
}

/** Default order: the client's categories first, then other categories, then manual services. */
export function defaultRank(kind: "mine" | "other" | "manual"): number {
  return kind === "mine" ? 0 : kind === "other" ? 1 : 2
}

/** Stable sort by rank, so services of the same kind keep the order they were selected in. */
export function sortByDefaultRank<T>(items: readonly T[], rank: (item: T) => number): T[] {
  return items
    .map((item, index) => ({ item, index, rank: rank(item) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.item)
}
