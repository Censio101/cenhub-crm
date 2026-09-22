export const SERVICES = [
  { id: "renovering", label: "Renovering" },
  { id: "tagdaekning", label: "Tagdækning" },
  { id: "tilbygning", label: "Tilbygning" },
  { id: "nybyg", label: "Nybyg" },
  { id: "badevaerelse", label: "Badeværelse" },
] as const

export type ServiceId = (typeof SERVICES)[number]["id"]

export const ALL_SERVICE_IDS: ServiceId[] = SERVICES.map((service) => service.id)

export type NamedService = {
  id: string
  label: string
}

export function isServiceId(value: string): value is ServiceId {
  return SERVICES.some((service) => service.id === value)
}

export function resolveServiceLabel(
  id: string,
  extras: readonly NamedService[] = []
): string {
  return (
    SERVICES.find((service) => service.id === id)?.label ??
    extras.find((service) => service.id === id)?.label ??
    id
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
  }
}
