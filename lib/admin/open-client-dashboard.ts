type DashboardRouter = {
  push: (href: string) => void
}

type OpenClientDashboardOptions = {
  /** Open the client dashboard in a new browser tab (keeps admin open in the current tab). */
  newTab?: boolean
  router?: DashboardRouter
}

export async function openClientDashboard(
  slug: string,
  setActiveOrganization: (slug: string | null) => Promise<boolean>,
  options: OpenClientDashboardOptions = {}
) {
  const success = await setActiveOrganization(slug)
  if (!success) return false

  if (options.newTab) {
    window.open("/overblik", "_blank", "noopener,noreferrer")
  } else if (options.router) {
    options.router.push("/overblik")
  } else {
    window.location.assign("/overblik")
  }

  return true
}
