import type { HubClient } from "@/lib/admin/hub-clients"

export type PickerOrganization = {
  id: string
  slug: string
  name: string
  metaAdAccountId: string
  demoMode: boolean
  metaEnabled: boolean
}

export function hubClientToPickerOrganization(client: HubClient): PickerOrganization | null {
  if (!client.inApp || client.partnerOnly || !client.slug) return null

  return {
    id: client.organizationId ?? client.key,
    slug: client.slug,
    name: client.name,
    metaAdAccountId: client.metaAdAccountId,
    demoMode: client.demo_mode,
    metaEnabled: client.metaEnabled,
  }
}

export function listPickerOrganizations(clients: readonly HubClient[]): PickerOrganization[] {
  return clients
    .map(hubClientToPickerOrganization)
    .filter((organization): organization is PickerOrganization => organization !== null)
    .sort((left, right) => left.name.localeCompare(right.name, "da"))
}

export function organizationMatchesPickerQuery(
  organization: Pick<PickerOrganization, "name" | "slug" | "metaAdAccountId">,
  query: string
): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true

  const haystack = [organization.name, organization.slug, organization.metaAdAccountId ?? ""]
    .join(" ")
    .toLowerCase()

  return haystack.includes(needle)
}

export function filterPickerOrganizations(
  organizations: readonly PickerOrganization[],
  query: string
): PickerOrganization[] {
  return organizations.filter((organization) =>
    organizationMatchesPickerQuery(organization, query)
  )
}

export type ContextBarClientList = {
  items: readonly PickerOrganization[]
  totalCount: number
  hiddenCount: number
  mode: "preview" | "search"
}

/** Full client list for the header switcher (scrollable popover). Active client stays first. */
export function resolveContextBarClientList(
  organizations: readonly PickerOrganization[],
  query: string,
  activeSlug: string | null
): ContextBarClientList {
  const needle = query.trim()
  const totalCount = organizations.length

  if (needle) {
    const items = filterPickerOrganizations(organizations, query)
    return {
      items,
      totalCount,
      hiddenCount: 0,
      mode: "search",
    }
  }

  const sorted = [...organizations]
  const active = activeSlug ? sorted.find((org) => org.slug === activeSlug) : undefined
  const rest = activeSlug ? sorted.filter((org) => org.slug !== activeSlug) : sorted
  const items = active ? [active, ...rest] : rest

  return {
    items,
    totalCount,
    hiddenCount: 0,
    mode: "preview",
  }
}

export function filterVisibleOrganizationOptions<
  T extends { slug: string; name: string; metaAdAccountId?: string },
>(options: readonly T[], query: string): T[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return [...options]

  return options.filter((option) =>
    organizationMatchesPickerQuery(
      {
        name: option.name,
        slug: option.slug,
        metaAdAccountId: option.metaAdAccountId ?? "",
      },
      query
    )
  )
}
