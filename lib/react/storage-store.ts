/**
 * Minimal external-store plumbing for localStorage-backed React state, used with
 * `useSyncExternalStore` (hydrates after the first render, no setState-in-effect).
 * `storage` events cover other tabs; `notifyStorageChange` covers writes in this tab.
 */

const listeners = new Set<() => void>()

export function subscribeToStorage(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

export function notifyStorageChange(): void {
  for (const listener of listeners) listener()
}

export function readStorageRaw(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
