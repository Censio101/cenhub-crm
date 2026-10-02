import { useEffect, type DependencyList } from "react"

/** Tells an async effect whether it was superseded or unmounted while it was running. */
export type EffectSignal = { readonly cancelled: boolean }

/**
 * Runs an async loader when the component mounts or `deps` change.
 *
 * Loaders should apply their results with `setState` **after** an `await`, so nothing is set
 * synchronously inside the effect (which would cause an extra render). Check
 * `signal.cancelled` after awaiting to skip results of a superseded run.
 *
 * `deps` is the caller's responsibility: list every value the loader reads, like a normal
 * `useEffect` dependency array.
 */
export function useAsyncEffect(
  effect: (signal: EffectSignal) => void | Promise<void>,
  deps: DependencyList
): void {
  useEffect(() => {
    const signal = { cancelled: false }
    void effect(signal)
    return () => {
      signal.cancelled = true
    }
    // The dependency list is supplied by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
