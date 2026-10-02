import { buildDefaultLeadSheetConfig } from "@/lib/lead-sheet/default-config"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"
import type { ClientService } from "@/lib/services/types"

/** Response of `GET /api/lead-sheet/config`: what the client dashboard needs about its client. */
export type CompanyConfigResponse = {
  leadSheet: ResolvedLeadSheetConfig | null
  services: ClientService[]
}

export type ServicesSnapshot = { services: ClientService[]; loaded: boolean }

const INITIAL: ServicesSnapshot = { services: [], loaded: false }
let snapshot: ServicesSnapshot = INITIAL
const listeners = new Set<() => void>()
let inflight: Promise<CompanyConfigResponse | null> | null = null

function publish(next: ServicesSnapshot) {
  snapshot = next
  for (const listener of listeners) listener()
}

export function subscribeToServices(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getServicesSnapshot(): ServicesSnapshot {
  return snapshot
}

export function getServerServicesSnapshot(): ServicesSnapshot {
  return INITIAL
}

/** Ends the loading state with no services (the request was refused, e.g. no client selected). */
export function markServicesLoadedEmpty() {
  if (!snapshot.loaded) publish({ services: [], loaded: true })
}

/** Forget what was loaded (another client was selected); the next load starts clean. */
export function resetServices() {
  publish(INITIAL)
}

function sameServices(a: ClientService[], b: ClientService[]) {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Loads the config once at a time (callers share the request) and keeps the services in a
 * small store. `null` when the request fails, so a transient error never replaces good data.
 */
export function fetchCompanyConfig(): Promise<CompanyConfigResponse | null> {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch("/api/lead-sheet/config", { cache: "no-store" })
      if (!res.ok) return null
      const data = (await res.json()) as Partial<CompanyConfigResponse>
      const result: CompanyConfigResponse = {
        leadSheet: data.leadSheet ?? null,
        services: Array.isArray(data.services) ? data.services : [],
      }
      if (!snapshot.loaded || !sameServices(snapshot.services, result.services)) {
        publish({ services: result.services, loaded: true })
      }
      return result
    } catch {
      return null
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export function leadSheetOrDefault(data: CompanyConfigResponse | null) {
  return data ? (data.leadSheet ?? buildDefaultLeadSheetConfig()) : null
}
