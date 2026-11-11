/** Query param when opening a client dashboard in a new tab (per-tab scope). */
export const CLIENT_ORG_QUERY_PARAM = "client"

/** Per-tab override sent on client API requests (sessionStorage is tab-isolated). */
export const TAB_ACTIVE_ORG_HEADER = "x-crm-tab-active-org-slug"

const TAB_ACTIVE_ORG_STORAGE_KEY = "crm_tab_active_org_slug"

export function getTabActiveOrgSlug(): string | null {
  if (typeof window === "undefined") return null
  let value = sessionStorage.getItem(TAB_ACTIVE_ORG_STORAGE_KEY)?.trim()
  if (!value) {
    const fromUrl = new URLSearchParams(window.location.search)
      .get(CLIENT_ORG_QUERY_PARAM)
      ?.trim()
    if (fromUrl) {
      sessionStorage.setItem(TAB_ACTIVE_ORG_STORAGE_KEY, fromUrl)
      value = fromUrl
    }
  }
  return value || null
}

export function setTabActiveOrgSlug(slug: string | null): void {
  if (typeof window === "undefined") return
  const normalized = slug?.trim() || null
  if (!normalized) {
    sessionStorage.removeItem(TAB_ACTIVE_ORG_STORAGE_KEY)
    return
  }
  sessionStorage.setItem(TAB_ACTIVE_ORG_STORAGE_KEY, normalized)
}

export function clearTabActiveOrgSlug(): void {
  setTabActiveOrgSlug(null)
}

/** Append `?client={slug}` so a new tab bootstraps its own org without touching the shared cookie from the opener. */
export function appendClientOrgQuery(path: string, slug: string): string {
  const trimmed = slug.trim()
  if (!trimmed) return path

  const hashIndex = path.indexOf("#")
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : ""
  const pathAndSearch = hashIndex >= 0 ? path.slice(0, hashIndex) : path

  const qIndex = pathAndSearch.indexOf("?")
  const pathname = qIndex >= 0 ? pathAndSearch.slice(0, qIndex) : pathAndSearch
  const search = qIndex >= 0 ? pathAndSearch.slice(qIndex + 1) : ""

  const params = new URLSearchParams(search)
  params.set(CLIENT_ORG_QUERY_PARAM, trimmed)

  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ""}${hash}`
}
