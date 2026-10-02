import type { ClientService } from "@/lib/services/types"

function fold(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

type Matchable = Pick<ClientService, "id" | "nameDa" | "nameEn">

/** Finds a service by slug or by its Danish / English name (case, accents and spacing ignored). */
export function matchService<T extends Matchable>(
  value: string,
  services: readonly T[]
): T | undefined {
  const needle = fold(value)
  if (!needle) return undefined
  return services.find(
    (service) =>
      service.id === value.trim() ||
      fold(service.id) === needle ||
      fold(service.nameDa) === needle ||
      fold(service.nameEn) === needle
  )
}

/** Splits free text like "Tag, Renovering; Nybyg" into candidate values. */
export function splitServiceText(value: string): string[] {
  return value
    .split(/[,;\n|]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/**
 * Turns incoming values into service slugs of the client. Values that match nothing are
 * returned in `unknown` so the caller can warn instead of silently dropping them.
 */
export function matchServices<T extends Matchable>(
  values: readonly string[],
  services: readonly T[]
): { ids: string[]; unknown: string[] } {
  const ids: string[] = []
  const unknown: string[] = []
  for (const value of values) {
    const found = matchService(value, services)
    if (!found) {
      if (value.trim()) unknown.push(value.trim())
    } else if (!ids.includes(found.id)) {
      ids.push(found.id)
    }
  }
  return { ids, unknown }
}
