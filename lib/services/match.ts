import type { ClientService } from "@/lib/services/types"
import { foldServiceMatchKey } from "@/lib/services/fold-match-key"

const fold = foldServiceMatchKey

export type Matchable = Pick<ClientService, "id" | "nameDa" | "nameEn">

/** Finds a service by org alias, slug, or Danish / English name (folded match). */
export function matchService<T extends Matchable>(
  value: string,
  services: readonly T[],
  aliasToSlug?: ReadonlyMap<string, string>
): T | undefined {
  const needle = fold(value)
  if (!needle) return undefined

  const slugFromAlias = aliasToSlug?.get(needle)
  if (slugFromAlias) {
    const fromAlias = services.find((service) => service.id === slugFromAlias)
    if (fromAlias) return fromAlias
  }

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
  services: readonly T[],
  aliasToSlug?: ReadonlyMap<string, string>
): { ids: string[]; unknown: string[] } {
  const ids: string[] = []
  const unknown: string[] = []
  for (const value of values) {
    const found = matchService(value, services, aliasToSlug)
    if (!found) {
      if (value.trim()) unknown.push(value.trim())
    } else if (!ids.includes(found.id)) {
      ids.push(found.id)
    }
  }
  return { ids, unknown }
}
