"use client"

import { useCallback, useEffect, useState, type CSSProperties } from "react"

import { computeSheetHeightPx } from "@/lib/leads/sheet-fit-height"

/** Below this width the sheet is replaced by cards, so no fixed height is applied. */
const DESKTOP_MIN_WIDTH_PX = 768

/**
 * Makes an element fill the rest of the window below where it starts, so the lead sheet shows
 * as many rows as fit instead of ending halfway down the page.
 * Returns a ref callback and the style to put on the element.
 */
export function useFitToViewportHeight(): {
  ref: (node: HTMLElement | null) => void
  style: CSSProperties | undefined
} {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [height, setHeight] = useState<number | null>(null)

  const measure = useCallback(() => {
    if (!node || window.innerWidth < DESKTOP_MIN_WIDTH_PX) {
      setHeight(null)
      return
    }
    const top = node.getBoundingClientRect().top + window.scrollY
    const next = computeSheetHeightPx(window.innerHeight, top)
    setHeight((prev) => (prev === next ? prev : next))
  }, [node])

  useEffect(() => {
    if (!node) return
    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }
    schedule()
    window.addEventListener("resize", schedule)
    // Things above the sheet (filters wrapping, the summary strip loading) move its top edge.
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    return () => {
      window.removeEventListener("resize", schedule)
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [measure, node])

  const style: CSSProperties | undefined =
    height === null ? undefined : { height, maxHeight: "none" }
  return { ref: setNode, style }
}
