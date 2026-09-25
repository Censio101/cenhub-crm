import { isVisibleInClientSwitcher } from "@/lib/admin/admin-routes"
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
  if (!isVisibleInClientSwitcher(client.slug)) return null

  return {
    id: client.organizationId ?? client.key,
    slug: client.slug,
    name: client.name,
    metaAdAccountId: client.metaAdAccountId,
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

/** Max clients shown in the header switcher before the user searches. */
export const CLIENT_SWITCHER_PREVIEW_LIMIT = 8

/** Max matches shown when searching in the header switcher. */
export const CLIENT_SWITCHER_SEARCH_LIMIT = 8

export type ContextBarClientList = {
  items: readonly PickerOrganization[]
  totalCount: number
  hiddenCount: number
  mode: "preview" | "search"
}

export function resolveContextBarClientList(
  organizations: readonly PickerOrganization[],
  query: string,
  activeSlug: string | null,
  previewLimit = CLIENT_SWITCHER_PREVIEW_LIMIT,
  searchLimit = CLIENT_SWITCHER_SEARCH_LIMIT
): ContextBarClientList {
  const needle = query.trim()
  const totalCount = organizations.length

  if (needle) {
    const matches = filterPickerOrganizations(organizations, query)
    const items = matches.slice(0, searchLimit)
    return {
      items,
      totalCount,
      hiddenCount: Math.max(0, matches.length - items.length),
      mode: "search",
    }
  }

  const sorted = [...organizations]
  const active = activeSlug ? sorted.find((org) => org.slug === activeSlug) : undefined
  const rest = activeSlug ? sorted.filter((org) => org.slug !== activeSlug) : sorted

  const preview: PickerOrganization[] = []
  if (active) preview.push(active)
  for (const org of rest) {
    if (preview.length >= previewLimit) break
    preview.push(org)
  }

  return {
    items: preview,
    totalCount,
    hiddenCount: Math.max(0, totalCount - preview.length),
    mode: "preview",
  }
}

export function filterVisibleOrganizationOptions<
  T extends { slug: string; name: string; metaAdAccountId?: string },
>(options: readonly T[], query: string): T[] {
  const visible = options.filter((option) => isVisibleInClientSwitcher(option.slug))
  const needle = query.trim().toLowerCase()
  if (!needle) return [...visible]

  return visible.filter((option) =>
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
