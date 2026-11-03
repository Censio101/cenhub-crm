/** Service filter only when the workspace has at least one enabled service. */
export function shouldShowServiceFilter(
  servicesLoaded: boolean,
  enabledServices: readonly unknown[]
): boolean {
  return servicesLoaded && enabledServices.length > 0
}

/** Source / funnel filter only when leads come from more than one platform. */
export function shouldShowLeadSourceFilter(leads: readonly { platform: string }[]): boolean {
  const platforms = new Set<string>()
  for (const lead of leads) {
    const platform = lead.platform.trim()
    if (platform) platforms.add(platform)
  }
  return platforms.size > 1
}

/** Customer source filter only when won customers have more than one source. */
export function shouldShowCustomerSourceFilter(
  customers: readonly { source: string }[]
): boolean {
  const sources = new Set<string>()
  for (const customer of customers) {
    if (customer.source) sources.add(customer.source)
  }
  return sources.size > 1
}
