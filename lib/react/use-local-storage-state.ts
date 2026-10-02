"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

import {
  notifyStorageChange,
  readStorageRaw,
  subscribeToStorage,
} from "@/lib/react/storage-store"

/** Writes to localStorage and tells every hook in this tab (the `storage` event only fires in other tabs). */
export function writeLocalStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable (private mode, quota); subscribers are still notified.
  }
  notifyStorageChange()
}

/**
 * A localStorage-backed value that hydrates without a setState-in-effect.
 * The server and the first client render see `null`, so `parse(null)` must return the default;
 * the stored value is read right after. The snapshot is the raw string, which React can
 * compare cheaply, and `parse` runs only when that string changes.
 */
export function useLocalStorageValue<T>(
  key: string,
  parse: (raw: string | null) => T
): [T, (value: T, serialize?: (value: T) => string | null) => void] {
  const raw = useSyncExternalStore(
    subscribeToStorage,
    () => readStorageRaw(key),
    () => null
  )

  // `parse` is expected to be a stable, module-level function.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => parse(raw), [raw])

  const setValue = useCallback(
    (next: T, serialize: (value: T) => string | null = (v) => JSON.stringify(v)) => {
      writeLocalStorage(key, serialize(next))
    },
    [key]
  )

  return [value, setValue]
}
