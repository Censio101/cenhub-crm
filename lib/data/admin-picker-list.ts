import type { HubClient } from "@/lib/admin/hub-clients"

type PickerSnapshot = {
  clients: HubClient[]
  loaded: boolean
  error: boolean
}

const MAX_ATTEMPTS = 3

let snapshot: PickerSnapshot = { clients: [], loaded: false, error: false }
let inflight: Promise<HubClient[] | null> | null = null
const listeners = new Set<() => void>()

function publish() {
  for (const listener of listeners) listener()
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchPickerClients(): Promise<HubClient[] | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch("/api/admin/organizations/picker", {
        cache: "no-store",
        credentials: "include",
      })
      if (response.ok) {
        const data = (await response.json()) as { clients?: HubClient[] }
        return data.clients ?? []
      }
    } catch {
      // retry below
    }
    if (attempt < MAX_ATTEMPTS) await wait(400 * attempt)
  }
  return null
}

export function subscribeAdminPickerList(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAdminPickerListSnapshot(): PickerSnapshot {
  return snapshot
}

export function resetAdminPickerList() {
  snapshot = { clients: [], loaded: false, error: false }
  inflight = null
  publish()
}

/** Shared picker fetch (deduped). Safe to call as soon as the admin shell is shown. */
export function ensureAdminPickerListLoaded(): Promise<HubClient[] | null> {
  if (snapshot.loaded) return Promise.resolve(snapshot.clients)
  if (inflight) return inflight

  inflight = (async () => {
    const clients = await fetchPickerClients()
    if (clients) {
      snapshot = { clients, loaded: true, error: false }
    } else {
      snapshot = { clients: [], loaded: true, error: true }
    }
    publish()
    return clients
  })().finally(() => {
    inflight = null
  })

  return inflight
}
