import { useState, type Dispatch, type SetStateAction } from "react"

/**
 * State that resets to `initial` whenever `key` changes.
 *
 * This is React's recommended way to "reset state when a value changes": the reset happens
 * while rendering instead of in an effect, so there is no extra render with stale state.
 */
export function useKeyedState<T>(
  initial: T,
  key: unknown
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState(initial)
  const [previousKey, setPreviousKey] = useState(key)

  if (!Object.is(previousKey, key)) {
    setPreviousKey(key)
    setState(initial)
  }

  return [state, setState]
}

/** State that follows `source` but can be edited locally until `source` changes again. */
export function useSyncedState<T>(source: T): [T, Dispatch<SetStateAction<T>>] {
  return useKeyedState(source, source)
}
