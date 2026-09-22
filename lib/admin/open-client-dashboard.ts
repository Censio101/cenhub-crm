type DashboardRouter = {
  push: (href: string) => void
  refresh: () => void
}

export async function openClientDashboard(
  slug: string,
  setActiveOrganization: (slug: string | null) => Promise<boolean>,
  router: DashboardRouter
) {
  const success = await setActiveOrganization(slug)
  if (success) {
    router.push("/overblik")
    router.refresh()
  }
  return success
}
