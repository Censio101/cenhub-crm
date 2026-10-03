import type { InternalOverview } from "@/lib/internal/metrics"

export async function loadInternalOverview(year?: number): Promise<InternalOverview> {
  const query = year ? `?year=${year}` : ""
  const response = await fetch(`/api/admin/commercial${query}`)
  const payload = (await response.json()) as InternalOverview & { error?: string }
  if (!response.ok) {
    throw new Error(payload.error || "Kunne ikke hente overblikket.")
  }
  return payload
}
