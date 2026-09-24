type DashboardRouter = {
  push: (href: string) => void
}

type OpenClientDashboardOptions = {
  /** Open the client dashboard in a new browser tab (keeps admin open in the current tab). */
  newTab?: boolean
  router?: DashboardRouter
  /** Dashboard route after the active organization is set. Defaults to `/overblik`. */
  path?: string
}

export async function openClientDashboard(
  slug: string,
  setActiveOrganization: (slug: string | null) => Promise<boolean>,
  options: OpenClientDashboardOptions = {}
) {
  const success = await setActiveOrganization(slug)
  if (!success) return false

  const path = options.path ?? "/overblik"

  if (options.newTab) {
    window.open(path, "_blank", "noopener,noreferrer")
  } else if (options.router) {
    options.router.push(path)
  } else {
    window.location.assign(path)
  }

  return true
}
