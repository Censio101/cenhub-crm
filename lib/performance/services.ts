export const SERVICES = [
  { id: "renovering", label: "Renovering" },
  { id: "tagdaekning", label: "Tagdækning" },
  { id: "tilbygning", label: "Tilbygning" },
  { id: "nybyg", label: "Nybyg" },
  { id: "badevaerelse", label: "Badeværelse" },
] as const

export type PresetServiceId = (typeof SERVICES)[number]["id"]

/** Any service slug. The services a client offers live in the database, not in this file. */
export type ServiceId = string

export const ALL_SERVICE_IDS: PresetServiceId[] = SERVICES.map((service) => service.id)

export type NamedService = {
  id: string
  label: string
}

export function isServiceId(value: string): value is PresetServiceId {
  return SERVICES.some((service) => service.id === value)
}

/** "tag-renovering" -> "Tag renovering" for services that are no longer in the client's list. */
function humanizeServiceSlug(slug: string): string {
  const words = slug.replace(/-+/g, " ").trim()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : slug
}

export function resolveServiceLabel(
  id: string,
  extras: readonly NamedService[] = []
): string {
  return (
    extras.find((service) => service.id === id)?.label ??
    SERVICES.find((service) => service.id === id)?.label ??
    humanizeServiceSlug(id)
  )
}

export function getServiceLabel(id: ServiceId | null | undefined): string {
  if (!id) return "Alle services"
  return SERVICES.find((service) => service.id === id)?.label ?? "Alle services"
}

export function serviceShare(id: ServiceId, month: number, year: number): number {
  const season = (month + 1) / 12

  switch (id) {
    case "tagdaekning":
      return 0.24 + 0.1 * Math.sin((month - 3) * 0.7)
    case "renovering":
      return 0.22 + 0.05 * Math.cos(month * 0.5)
    case "tilbygning":
      return 0.16 + 0.06 * Math.sin((month - 5) * 0.55)
    case "nybyg":
      return (year >= 2026 ? 0.18 : 0.13) + 0.04 * season
    case "badevaerelse":
      return 0.12 + 0.04 * Math.cos((month + 1) * 0.8)
    default:
      // Services created by an admin have no demo curve; use a flat share.
      return 0.12
  }
}
