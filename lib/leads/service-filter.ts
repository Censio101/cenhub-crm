import { getLeadServiceIds, type Lead } from "@/lib/leads"
import type { NamedService } from "@/lib/performance/services"

/** Match leads against a service slug from the dashboard filter (null = all services). */
export function leadMatchesServiceFilter(
  lead: Pick<Lead, "serviceIds" | "service">,
  serviceSlug: string | null | undefined,
  _enabledServices: readonly NamedService[] = []
): boolean {
  if (!serviceSlug) return true
  const ids = getLeadServiceIds(lead)
  return ids.includes(serviceSlug)
}
