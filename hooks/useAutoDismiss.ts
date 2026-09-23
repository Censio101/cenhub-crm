import { useEffect } from "react"

export function useAutoDismiss(
  value: string | null,
  onDismiss: () => void,
  delayMs = 5000
) {
  useEffect(() => {
    if (!value) return
    const timer = window.setTimeout(onDismiss, delayMs)
    return () => window.clearTimeout(timer)
  }, [value, onDismiss, delayMs])
}
