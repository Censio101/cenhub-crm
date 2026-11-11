import { appendClientOrgQuery } from "@/lib/auth/tab-active-organization"

type DashboardRouter = {
  push: (href: string) => void
}

type OpenClientDashboardOptions = {
  /** Open the client dashboard in a new browser tab (keeps admin open in the current tab). */
  newTab?: boolean
  router?: DashboardRouter
  /** Dashboard route after the active organization is set. Defaults to `/`. */
  path?: string
}

export async function openClientDashboard(
  slug: string,
  setActiveOrganization: (slug: string | null) => Promise<boolean>,
  options: OpenClientDashboardOptions = {}
) {
  const path = options.path ?? "/"

  if (options.newTab) {
    const target = appendClientOrgQuery(path, slug)
    window.open(target, "_blank", "noopener,noreferrer")
    return true
  }

  const success = await setActiveOrganization(slug)
  if (!success) return false

  if (options.router) {
    options.router.push(path)
  } else {
    window.location.assign(path)
  }

  return true
}
