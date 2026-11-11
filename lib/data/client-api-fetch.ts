import {
  getTabActiveOrgSlug,
  TAB_ACTIVE_ORG_HEADER,
} from "@/lib/auth/tab-active-organization"

/**
 * Browser `fetch` for org-scoped client APIs. Admins viewing multiple client tabs send the
 * tab's slug via header so requests do not rely on the shared active-org cookie alone.
 */
export function clientApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  const tabSlug = getTabActiveOrgSlug()
  if (tabSlug) {
    headers.set(TAB_ACTIVE_ORG_HEADER, tabSlug)
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
  })
}
